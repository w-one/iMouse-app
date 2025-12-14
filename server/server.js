#!/usr/bin/env node

/* ========================================
   iMouse 2.0 - Mac Server (HTTP + WS, Worker分離)
   ======================================== */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');

const TrackpadHandler = require('./handlers/trackpad');
const LauncherHandler = require('./handlers/launcher');
const KeyboardHandler = require('./handlers/keyboard');
const PresentationHandler = require('./handlers/presentation');

const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

class RobotWorkerBridge {
  constructor(config) {
    this.config = config;
    this.worker = null;
    this.ready = false;
    this.buffer = [];
    this.spawnWorker();
  }

  spawnWorker() {
    const workerPath = path.join(__dirname, 'worker.js');
    this.worker = fork(workerPath, [], {
      env: {
        ...process.env,
        IMOUSE_WORKER_DATA: JSON.stringify(this.config),
      },
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    });
    this.ready = false;

    this.worker.on('message', (message) => {
      switch (message.type) {
        case 'ready':
          this.ready = true;
          this.flushBuffer();
          console.log('⚙️  Robot worker ready');
          if (message.screen) {
            console.log(`   Screen size: ${message.screen.width}x${message.screen.height}`);
          }
          break;
        case 'workerError':
          console.error(`❌ Worker error [${message.label}]: ${message.message}`);
          break;
        case 'workerWarn':
          if (config.logging.verbose) {
            console.warn(`⚠️  Worker warning: ${message.message}`);
          }
          break;
        default:
          if (config.logging.verbose) {
            console.log('ℹ️  Worker message:', message);
          }
      }
    });

    this.worker.on('error', (err) => {
      console.error('❌ Worker process error:', err);
    });

    this.worker.on('exit', (code) => {
      console.warn(`⚠️  Worker exited with code ${code}. Respawning...`);
      this.ready = false;
      setTimeout(() => this.spawnWorker(), 200);
    });
  }

  flushBuffer() {
    while (this.ready && this.buffer.length > 0) {
      const msg = this.buffer.shift();
      this.worker.postMessage(msg);
    }
  }

  send(type, payload = {}) {
    if (!this.worker || this.worker.killed) return;
    const message = { type, payload };
    if (this.ready) {
      try {
        this.worker.send(message);
      } catch (err) {
        console.error('❌ Worker send error:', err.message);
      }
    } else {
      this.buffer.push(message);
      if (this.buffer.length > 500) {
        this.buffer.shift();
      }
    }
  }
}

class iMouseServer {
  constructor() {
    this.config = config;
    this.app = express();
    this.httpServer = null;
    this.wss = null;
    this.clients = new Set();
    this.handlers = {};
    this.robotWorker = new RobotWorkerBridge(this.config);
  }

  start() {
    console.log('🚀 iMouse 2.0 Server Starting...');
    console.log('━'.repeat(50));

    const publicDir = path.join(__dirname, '..', 'public');
    if (fs.existsSync(publicDir)) {
      this.app.use(express.static(publicDir));
      console.log(`📂 Serving PWA assets from ${publicDir}`);
    } else {
      console.warn('⚠️  public directory not found. Static files will not be served.');
    }

    this.httpServer = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.httpServer });

    this.initHandlers();
    this.attachSocketHandlers();

    this.httpServer.on('error', (err) => this.handleError(err));

    this.httpServer.listen(this.config.port, this.config.host, () => {
      this.displayServerInfo();
    });
  }

  initHandlers() {
    try {
      this.handlers.trackpad = new TrackpadHandler(this.config, this.robotWorker);
      this.handlers.launcher = new LauncherHandler(this.config);
      this.handlers.keyboard = new KeyboardHandler(this.config);
      this.handlers.presentation = new PresentationHandler(this.config);
      console.log('✅ All handlers initialized');
    } catch (err) {
      console.error('❌ Failed to initialize handlers:', err.message);
      process.exit(1);
    }
  }

  attachSocketHandlers() {
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
    this.wss.on('error', (err) => this.handleError(err));
  }

  handleConnection(ws, req) {
    const clientIp = req.socket.remoteAddress;
    console.log(`📱 Client connected: ${clientIp}`);

    if (this.clients.size >= this.config.security.maxConnections) {
      console.log(`⚠️  Max connections reached, rejecting ${clientIp}`);
      ws.close(1008, 'Max connections reached');
      return;
    }

    this.clients.add(ws);

    this.sendToClient(ws, {
      type: 'connected',
      macName: os.hostname(),
      macOS: `${os.platform()} ${os.release()}`
    });

    ws.on('message', (data) => this.handleMessage(ws, data));
    ws.on('close', () => {
      this.clients.delete(ws);
      console.log(`📱 Client disconnected: ${clientIp} (${this.clients.size} active)`);
    });
    ws.on('error', (err) => {
      console.error(`❌ Client error (${clientIp}):`, err.message);
    });
  }

  handleMessage(ws, data) {
    try {
      const message = JSON.parse(data);
      if (this.config.logging.verbose) {
        console.log('📨', message);
      }

      switch (message.type) {
        case 'move':
          this.handlers.trackpad.move(message.dx, message.dy);
          break;
        case 'click':
          this.handlers.trackpad.click();
          break;
        case 'rightClick':
          this.handlers.trackpad.rightClick();
          break;
        case 'scroll':
          this.handlers.trackpad.scroll(message.dx, message.dy);
          break;
        case 'zoom':
          this.handlers.trackpad.zoom(message.delta);
          break;
        case 'dragStart':
          this.handlers.trackpad.dragStart();
          break;
        case 'dragEnd':
          this.handlers.trackpad.dragEnd();
          break;
        case 'gesture':
          this.handlers.trackpad.gesture(message.gesture);
          break;
        case 'launchApp':
          this.handlers.launcher.launch(message);
          break;
        case 'getAppList': {
          const apps = this.handlers.launcher.getAppList();
          this.sendToClient(ws, { type: 'appList', apps });
          break;
        }
        case 'typeText':
          this.handlers.keyboard.typeText(message.text, message.modifiers);
          break;
        case 'typeKey':
          this.handlers.keyboard.typeKey(message.key, message.modifiers);
          break;
        case 'specialKey':
          this.handlers.keyboard.specialKey(message.action, message.key);
          break;
        case 'switchLanguage':
          this.handlers.keyboard.switchLanguage(message.lang);
          break;
        case 'shortcut':
          this.handlers.keyboard.shortcut(message.shortcut);
          break;
        case 'presentation':
          this.handlers.presentation.handleAction(message.action, message);
          break;
        case 'getPresentationInfo': {
          const info = this.handlers.presentation.getInfo();
          this.sendToClient(ws, { type: 'presentationInfo', ...info });
          break;
        }
        default:
          console.warn(`⚠️  Unknown message type: ${message.type}`);
      }
    } catch (err) {
      console.error('❌ Message handling error:', err.message);
      if (this.config.logging?.verbose) {
        console.error('   Stack:', err.stack);
      }
      this.sendToClient(ws, { type: 'error', message: 'Failed to process message' });
    }
  }

  sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (err) {
        console.error('❌ Send error:', err.message);
      }
    }
  }

  broadcast(data) {
    const payload = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  handleError(err) {
    console.error('❌ Server error:', err.message || err);
  }

  displayServerInfo() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    Object.keys(interfaces).forEach((name) => {
      interfaces[name].forEach((iface) => {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      });
    });

    console.log('');
    console.log('✅ iMouse 2.0 Server Running!');
    console.log('━'.repeat(50));
    console.log(`🖥️  Mac: ${os.hostname()}`);
    console.log('🌐 IP Address(es):');
    addresses.forEach((addr) => {
      console.log(`   📍 http://${addr}:${this.config.port}`);
    });
    console.log('━'.repeat(50));
    console.log('');
    console.log('📱 On your iPhone:');
    console.log('   1. Connect to the same Wi-Fi');
    console.log('   2. Open Safari');
    console.log(`   3. Visit: http://${addresses[0] || 'YOUR_IP'}:${this.config.port}`);
    console.log('   4. Tap the settings icon and connect');
    console.log('');
    console.log('━'.repeat(50));
    console.log('Press Ctrl+C to stop server');
    console.log('');
  }

  stop() {
    console.log('\n🛑 Stopping server...');
    this.clients.forEach((client) => client.close());

    if (this.wss) {
      this.wss.close();
    }

    if (this.httpServer) {
      this.httpServer.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }
}

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

const server = new iMouseServer();
server.start();

process.on('SIGINT', () => server.stop());
process.on('SIGTERM', () => server.stop());

module.exports = iMouseServer;
