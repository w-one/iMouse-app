/* ========================================
   iMouse 2.0 - WebSocket通信ハンドラー
   ======================================== */

class WebSocketHandler {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.reconnectInterval = 3000;
    this.reconnectTimer = null;
    this.messageQueue = [];
    this.listeners = new Map();
  }

  // 接続
  connect(ip, port) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('Already connected');
      return;
    }

    const url = `ws://${ip}:${port}`;
    console.log(`Connecting to ${url}...`);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.connected = true;
        this.updateStatus('connected');
        this.flushQueue();
        this.emit('connected', { ip, port });

        // 再接続タイマーをクリア
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received:', data);
          this.emit('message', data);

          // タイプ別イベント発火
          if (data.type) {
            this.emit(data.type, data);
          }
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.connected = false;
        this.updateStatus('disconnected');
        this.emit('disconnected');

        // 自動再接続
        this.scheduleReconnect(ip, port);
      };

    } catch (err) {
      console.error('Connection failed:', err);
      this.updateStatus('error');
      this.emit('error', err);
    }
  }

  // 切断
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
    this.updateStatus('disconnected');
  }

  // 再接続スケジュール
  scheduleReconnect(ip, port) {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.reconnectTimer = null;
      this.connect(ip, port);
    }, this.reconnectInterval);
  }

  // メッセージ送信
  send(data) {
    const message = typeof data === 'string' ? data : JSON.stringify(data);

    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(message);
        console.log('Sent:', data);
      } catch (err) {
        console.error('Failed to send:', err);
        this.messageQueue.push(message);
      }
    } else {
      console.log('Queuing message (not connected)');
      this.messageQueue.push(message);
    }
  }

  // キューをフラッシュ
  flushQueue() {
    while (this.messageQueue.length > 0 && this.connected) {
      const message = this.messageQueue.shift();
      this.ws.send(message);
    }
  }

  // イベントリスナー登録
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // イベントリスナー解除
  off(event, callback) {
    if (!this.listeners.has(event)) {
      return;
    }
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  // イベント発火
  emit(event, data) {
    if (!this.listeners.has(event)) {
      return;
    }
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`Error in ${event} listener:`, err);
      }
    });
  }

  // ステータス更新
  updateStatus(status) {
    const indicator = document.getElementById('statusIndicator');
    const statusText = indicator?.querySelector('.status-text');
    const statusBadge = document.getElementById('connectionStatus');

    if (status === 'connected') {
      indicator?.classList.add('connected');
      if (statusText) statusText.textContent = 'Connected';
      if (statusBadge) statusBadge.textContent = '✓ Connected';
      if (statusBadge) statusBadge.style.background = '#34c759';
    } else if (status === 'disconnected') {
      indicator?.classList.remove('connected');
      if (statusText) statusText.textContent = 'Disconnected';
      if (statusBadge) statusBadge.textContent = '⚠️ Disconnected';
      if (statusBadge) statusBadge.style.background = '#ff3b30';
    } else if (status === 'error') {
      indicator?.classList.remove('connected');
      if (statusText) statusText.textContent = 'Error';
      if (statusBadge) statusBadge.textContent = '❌ Error';
      if (statusBadge) statusBadge.style.background = '#ff3b30';
    }
  }

  // 接続状態確認
  isConnected() {
    return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// グローバルインスタンス
const wsHandler = new WebSocketHandler();
