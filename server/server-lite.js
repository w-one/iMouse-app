#!/usr/bin/env node

/* ========================================
   iMouse 2.0 - Mac Server (Lite版)
   robotjs不要 - AppleScriptのみで動作
   ======================================== */

const WebSocket = require('ws');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 設定読み込み
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

class iMouseServerLite {
  constructor() {
    this.config = config;
    this.wss = null;
    this.clients = new Set();
  }

  start() {
    console.log('🚀 iMouse 2.0 Server (Lite) Starting...');
    console.log('━'.repeat(50));
    console.log('⚡ Lightweight version - No robotjs required!');
    console.log('━'.repeat(50));

    this.wss = new WebSocket.Server({
      port: this.config.port,
      host: this.config.host
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.displayServerInfo();
  }

  handleConnection(ws, req) {
    const clientIp = req.socket.remoteAddress;
    console.log(`📱 Client connected: ${clientIp}`);

    this.clients.add(ws);

    this.sendToClient(ws, {
      type: 'connected',
      macName: os.hostname(),
      macOS: os.platform() + ' ' + os.release()
    });

    ws.on('message', (data) => this.handleMessage(ws, data));
    ws.on('close', () => {
      this.clients.delete(ws);
      console.log(`📱 Client disconnected: ${clientIp}`);
    });
  }

  handleMessage(ws, data) {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'click':
          this.executeAppleScript('tell application "System Events" to click at (position of mouse)');
          break;

        case 'rightClick':
          this.executeAppleScript('tell application "System Events" to right click at (position of mouse)');
          break;

        case 'scroll':
          const scrollKey = message.dy > 0 ? '125' : '126';
          const scrollTimes = Math.min(Math.abs(Math.round(message.dy / 5)), 10);
          this.executeAppleScript(`tell application "System Events" to repeat ${scrollTimes} times\nkey code ${scrollKey}\nend repeat`);
          break;

        case 'zoom':
          const zoomKey = message.delta > 0 ? '=' : '-';
          this.executeAppleScript(`tell application "System Events" to keystroke "${zoomKey}" using command down`);
          break;

        case 'gesture':
          this.handleGesture(message.gesture);
          break;

        case 'launchApp':
          this.launchApp(message.appName);
          break;

        case 'typeText':
          this.typeText(message.text);
          break;

        case 'specialKey':
          this.specialKey(message.action);
          break;

        case 'shortcut':
          this.executeShortcut(message.shortcut);
          break;

        case 'switchLanguage':
          this.executeAppleScript('tell application "System Events" to keystroke space using control down');
          break;

        case 'presentation':
          this.handlePresentation(message.action);
          break;

        case 'move':
          // マウス移動は制限あり - cliclick推奨
          console.log('Move:', message.dx, message.dy);
          break;

        default:
          console.warn(`Unknown message: ${message.type}`);
      }
    } catch (err) {
      console.error('Message error:', err);
    }
  }

  executeAppleScript(script) {
    exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
      if (error) {
        console.error('AppleScript error:', stderr || error.message);
      }
    });
  }

  handleGesture(type) {
    const gestures = {
      'missionControl': 'key code 126 using control down',
      'appExpose': 'key code 125 using control down',
      'desktopLeft': 'key code 123 using control down',
      'desktopRight': 'key code 124 using control down'
    };

    if (gestures[type]) {
      this.executeAppleScript(`tell application "System Events" to ${gestures[type]}`);
      console.log(`👆 Gesture: ${type}`);
    }
  }

  launchApp(appName) {
    exec(`open -a "${appName}"`, (error) => {
      if (error) {
        console.error(`Failed to launch ${appName}`);
      } else {
        console.log(`🚀 Launched: ${appName}`);
      }
    });
  }

  typeText(text) {
    // エスケープ処理
    const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'");

    const script = `
      set the clipboard to "${escaped}"
      tell application "System Events"
        keystroke "v" using command down
      end tell
    `;

    this.executeAppleScript(script);
    console.log(`⌨️  Typed: ${text.substring(0, 50)}...`);
  }

  specialKey(action) {
    const keys = {
      'enter': 'return',
      'tab': 'tab',
      'esc': 'escape',
      'delete': 'delete'
    };

    const key = keys[action] || action;
    this.executeAppleScript(`tell application "System Events" to keystroke ${key}`);
  }

  executeShortcut(shortcut) {
    const parts = shortcut.toLowerCase().split('+');
    const key = parts.pop();
    const modifiers = parts.map(m => {
      const map = { cmd: 'command', ctrl: 'control', opt: 'option', alt: 'option' };
      return map[m] || m;
    }).join(' down, ') + ' down';

    this.executeAppleScript(`tell application "System Events" to keystroke "${key}" using {${modifiers}}`);
    console.log(`⌨️  Shortcut: ${shortcut}`);
  }

  handlePresentation(action) {
    const actions = {
      'next': 'key code 124',
      'prev': 'key code 123',
      'black': 'keystroke "b"',
      'white': 'keystroke "w"'
    };

    if (actions[action]) {
      this.executeAppleScript(`tell application "System Events" to ${actions[action]}`);
      console.log(`🎬 Presentation: ${action}`);
    }
  }

  sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  displayServerInfo() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    Object.keys(interfaces).forEach(name => {
      interfaces[name].forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      });
    });

    console.log('');
    console.log('✅ iMouse 2.0 Server (Lite) Running!');
    console.log('━'.repeat(50));
    console.log(`🖥️  Mac: ${os.hostname()}`);
    console.log(`🌐 IP Address(es):`);
    addresses.forEach(addr => {
      console.log(`   📍 ${addr}:${this.config.port}`);
    });
    console.log('━'.repeat(50));
    console.log('');
    console.log('💡 This is the LITE version:');
    console.log('   ✅ Keyboard, Apps, Gestures work perfectly');
    console.log('   ⚠️  Mouse movement disabled (use cliclick for full support)');
    console.log('');
    console.log('📱 Connect from iPhone at:');
    console.log(`   http://${addresses[0]}:8000`);
    console.log('');
    console.log('━'.repeat(50));
    console.log('Press Ctrl+C to stop');
    console.log('');
  }

  stop() {
    console.log('\n🛑 Stopping server...');
    this.clients.forEach(client => client.close());
    this.wss.close(() => {
      console.log('✅ Server stopped');
      process.exit(0);
    });
  }
}

const server = new iMouseServerLite();
server.start();

process.on('SIGINT', () => server.stop());
process.on('SIGTERM', () => server.stop());

module.exports = iMouseServerLite;
