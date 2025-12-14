/* ========================================
   iMouse 2.0 - リモートキーボード
   ======================================== */

class RemoteKeyboard {
  constructor() {
    this.activeModifiers = new Set();
    this.currentLang = 'EN';
    this.inputMode = 'buffered';
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    const sendBtn = document.getElementById('sendText');
    const keyboardInput = document.getElementById('keyboardInput');
    const langToggle = document.getElementById('langToggle');
    const modifierBtns = document.querySelectorAll('.modifier-btn');
    const actionBtns = document.querySelectorAll('.action-btn');
    const inputModeRadios = document.querySelectorAll('input[name="inputMode"]');

    // 送信ボタン
    sendBtn?.addEventListener('click', () => {
      this.sendText();
    });

    // Enterキーで送信
    keyboardInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.sendText();
      }
    });

    // リアルタイム入力
    keyboardInput?.addEventListener('input', (e) => {
      if (this.inputMode === 'realtime') {
        const lastChar = e.target.value.slice(-1);
        if (lastChar) {
          this.sendKey(lastChar);
        }
      }
    });

    // 言語切替
    langToggle?.addEventListener('click', () => {
      this.toggleLanguage();
    });

    // 修飾キー
    modifierBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.toggleModifier(btn.dataset.key);
      });
    });

    // クイックアクション
    actionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.executeAction(btn.dataset.action);
      });
    });

    // 入力モード切替
    inputModeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.inputMode = e.target.value;
        console.log('Input mode:', this.inputMode);
      });
    });
  }

  // テキスト送信
  sendText() {
    const input = document.getElementById('keyboardInput');
    const text = input?.value;

    if (!text) {
      return;
    }

    console.log('Sending text:', text);
    settingsManager.haptic('medium');

    wsHandler.send({
      type: 'typeText',
      text: text,
      modifiers: Array.from(this.activeModifiers)
    });

    // フィードバック表示
    this.showSendingIndicator();

    // 入力クリア
    if (input) input.value = '';

    // 修飾キーをリセット
    this.clearModifiers();
  }

  // 1文字送信
  sendKey(char) {
    wsHandler.send({
      type: 'typeKey',
      key: char,
      modifiers: Array.from(this.activeModifiers)
    });
  }

  // 言語切替
  toggleLanguage() {
    this.currentLang = this.currentLang === 'EN' ? 'JA' : 'EN';
    const langToggle = document.getElementById('langToggle');
    if (langToggle) {
      langToggle.textContent = `🌐 ${this.currentLang}`;
    }

    settingsManager.haptic('light');

    wsHandler.send({
      type: 'switchLanguage',
      lang: this.currentLang
    });
  }

  // 修飾キートグル
  toggleModifier(key) {
    const btn = document.querySelector(`[data-key="${key}"]`);

    if (this.activeModifiers.has(key)) {
      this.activeModifiers.delete(key);
      btn?.classList.remove('active');
    } else {
      this.activeModifiers.add(key);
      btn?.classList.add('active');
    }

    settingsManager.haptic('light');
  }

  // 修飾キーをクリア
  clearModifiers() {
    this.activeModifiers.clear();
    document.querySelectorAll('.modifier-btn').forEach(btn => {
      btn.classList.remove('active');
    });
  }

  // アクション実行
  executeAction(action) {
    console.log('Executing action:', action);
    settingsManager.haptic('medium');

    const actionMap = {
      enter: '\n',
      tab: '\t',
      esc: '\x1b',
      delete: '\x7f'
    };

    wsHandler.send({
      type: 'specialKey',
      action: action,
      key: actionMap[action] || action
    });
  }

  // 送信インジケーター表示
  showSendingIndicator() {
    let indicator = document.querySelector('.sending-indicator');

    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'sending-indicator';
      indicator.textContent = 'Sending...';
      document.body.appendChild(indicator);
    }

    indicator.classList.add('active');

    setTimeout(() => {
      indicator.classList.remove('active');
    }, 800);
  }
}

// グローバルインスタンス
const remoteKeyboard = new RemoteKeyboard();

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  remoteKeyboard.init();
});
