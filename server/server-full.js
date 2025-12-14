#!/usr/bin/env node

/* ========================================
   iMouse 2.0 - Mac Server (Full版)
   cliclick使用 - 全機能対応
   ======================================== */

const WebSocket = require('ws');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

class iMouseServerFull {
  constructor() {
    this.config = config;
    this.wss = null;
    this.clients = new Set();
    this.isDragging = false;
  }

  start() {
    console.log('🚀 iMouse 2.0 Server (Full) Starting...');
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
        case 'move':
          this.moveMouse(message.dx, message.dy);
          break;

        case 'click':
          this.click();
          break;

        case 'rightClick':
          this.rightClick();
          break;

        case 'scroll':
          this.scroll(message.dx, message.dy);
          break;

        case 'zoom':
          this.zoom(message.delta);
          break;

        case 'dragStart':
          this.dragStart();
          break;

        case 'dragEnd':
          this.dragEnd();
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

        case 'typeKey':
          this.typeKey(message.key);
          break;

        case 'specialKey':
          this.specialKey(message.action);
          break;

        case 'shortcut':
          this.executeShortcut(message.shortcut);
          break;

        case 'switchLanguage':
          this.switchLanguage();
          break;

        case 'presentation':
          this.handlePresentation(message.action);
          break;

        default:
          console.warn(`Unknown message: ${message.type}`);
      }
    } catch (err) {
      console.error('Message error:', err);
    }
  }

  // マウス移動（cliclick使用）
  moveMouse(dx, dy) {
    const speed = this.config.cursor?.speedMultiplier || 1.0;
    const moveX = Math.round(dx * speed);
    const moveY = Math.round(dy * speed);

    if (moveX !== 0 || moveY !== 0) {
      exec(`cliclick m:+${moveX},+${moveY}`, (error) => {
        if (error && this.config.logging?.verbose) {
          console.error('Move error:', error.message);
        }
      });
    }
  }

  // クリック
  click() {
    exec('cliclick c:.', (error) => {
      if (error) console.error('Click error:', error.message);
    });
  }

  // 右クリック
  rightClick() {
    exec('cliclick rc:.', (error) => {
      if (error) console.error('Right click error:', error.message);
    });
  }

  // スクロール
  scroll(dx, dy) {
    const scrollAmount = Math.round(dy * -1); // 方向を反転

    if (Math.abs(scrollAmount) > 0) {
      // cliclickのスクロール: w:数値 （正=下、負=上）
      exec(`cliclick w:${scrollAmount}`, (error) => {
        if (error && this.config.logging?.verbose) {
          console.error('Scroll error:', error.message);
        }
      });
    }
  }

  // ズーム
  zoom(delta) {
    const key = delta > 0 ? '=' : '-';
    exec(`cliclick kd:cmd t:${key} ku:cmd`, (error) => {
      if (error) console.error('Zoom error:', error.message);
    });
  }

  // ドラッグ開始
  dragStart() {
    this.isDragging = true;
    exec('cliclick dd:.', (error) => {
      if (error) console.error('Drag start error:', error.message);
    });
  }

  // ドラッグ終了
  dragEnd() {
    this.isDragging = false;
    exec('cliclick du:.', (error) => {
      if (error) console.error('Drag end error:', error.message);
    });
  }

  // ジェスチャー
  handleGesture(type) {
    const gestures = {
      'missionControl': 'kd:ctrl t:up ku:ctrl',
      'appExpose': 'kd:ctrl t:down ku:ctrl',
      'desktopLeft': 'kd:ctrl t:left ku:ctrl',
      'desktopRight': 'kd:ctrl t:right ku:ctrl'
    };

    if (gestures[type]) {
      exec(`cliclick ${gestures[type]}`, (error) => {
        if (!error) console.log(`👆 Gesture: ${type}`);
      });
    }
  }

  // アプリ起動
  launchApp(appName) {
    exec(`open -a "${appName}"`, (error) => {
      if (error) {
        console.error(`Failed to launch ${appName}`);
      } else {
        console.log(`🚀 Launched: ${appName}`);
      }
    });
  }

  // テキスト入力
  typeText(text) {
    const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'");
    const script = `set the clipboard to "${escaped}"\ntell application "System Events"\nkeystroke "v" using command down\nend tell`;

    exec(`osascript -e '${script}'`, (error) => {
      if (!error) {
        console.log(`⌨️  Typed: ${text.substring(0, 50)}...`);
      }
    });
  }

  // 1文字入力
  typeKey(key) {
    exec(`cliclick t:${key}`, (error) => {
      if (error && /[^\x00-\x7F]/.test(key)) {
        // 日本語の場合はクリップボード経由
        this.typeText(key);
      }
    });
  }

  // 特殊キー
  specialKey(action) {
    const keys = {
      'enter': 'return',
      'tab': 'tab',
      'esc': 'escape',
      'delete': 'delete'
    };

    const key = keys[action] || action;
    exec(`cliclick t:${key}`, (error) => {
      if (error) console.error('Special key error:', error.message);
    });
  }

  // ショートカット
  executeShortcut(shortcut) {
    const parts = shortcut.toLowerCase().split('+');
    const key = parts.pop();

    // 修飾キーを押す
    let cmd = '';
    parts.forEach(mod => {
      const modMap = { cmd: 'cmd', ctrl: 'ctrl', opt: 'alt', alt: 'alt', shift: 'shift' };
      const modKey = modMap[mod] || mod;
      cmd += `kd:${modKey} `;
    });

    // キーをタイプ
    cmd += `t:${key} `;

    // 修飾キーを離す
    parts.reverse().forEach(mod => {
      const modMap = { cmd: 'cmd', ctrl: 'ctrl', opt: 'alt', alt: 'alt', shift: 'shift' };
      const modKey = modMap[mod] || mod;
      cmd += `ku:${modKey} `;
    });

    exec(`cliclick ${cmd}`, (error) => {
      if (!error) console.log(`⌨️  Shortcut: ${shortcut}`);
    });
  }

  // 言語切替
  switchLanguage() {
    exec('cliclick kd:ctrl t:space ku:ctrl', (error) => {
      if (!error) console.log(`🌐 Language switched`);
    });
  }

  // プレゼンテーション
  handlePresentation(action) {
    const actions = {
      'next': 't:right',
      'prev': 't:left',
      'black': 't:b',
      'white': 't:w'
    };

    if (actions[action]) {
      exec(`cliclick ${actions[action]}`, (error) => {
        if (!error) console.log(`🎬 Presentation: ${action}`);
      });
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
    console.log('✅ iMouse 2.0 Server (Full) Running!');
    console.log('━'.repeat(50));
    console.log(`🖥️  Mac: ${os.hostname()}`);
    console.log(`🌐 IP Address(es):`);
    addresses.forEach(addr => {
      console.log(`   📍 ${addr}:${this.config.port}`);
    });
    console.log('━'.repeat(50));
    console.log('');
    console.log('✅ All features enabled:');
    console.log('   ✅ Mouse movement (cliclick)');
    console.log('   ✅ Click & Right click');
    console.log('   ✅ Scroll & Zoom');
    console.log('   ✅ Drag & Drop');
    console.log('   ✅ Gestures');
    console.log('   ✅ Keyboard (JP/EN)');
    console.log('   ✅ App Launcher');
    console.log('   ✅ Presentation Mode');
    console.log('');
    console.log('📱 Connect from iPhone:');
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

const server = new iMouseServerFull();
server.start();

process.on('SIGINT', () => server.stop());
process.on('SIGTERM', () => server.stop());

module.exports = iMouseServerFull;
