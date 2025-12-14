/* ========================================
   iMouse 2.0 - 設定管理
   ======================================== */

class SettingsManager {
  constructor() {
    this.settings = this.getDefaultSettings();
    this.load();
  }

  // デフォルト設定
  getDefaultSettings() {
    return {
      connection: {
        ip: localStorage.getItem('macIp') || '',
        port: 8080
      },
      cursor: {
        speed: 5,
        acceleration: 'medium'
      },
      scroll: {
        speed: 5,
        acceleration: 'medium',
        inertia: true,
        natural: true
      },
      gestures: {
        tapSensitivity: 5,
        swipeThreshold: 5
      },
      haptics: {
        enabled: true,
        strength: 5
      },
      shortcuts: {
        btn1: 'cmd+c',
        btn2: 'cmd+v',
        btn3: 'cmd+z',
        btn4: 'cmd+t'
      },
      apps: [
        { name: 'Slack', icon: '💬', type: 'app' },
        { name: 'Notion', icon: '📝', type: 'app' },
        { name: 'Notion Calendar', icon: '📅', type: 'app' },
        { name: 'Canva', icon: '🎨', type: 'app' },
        { name: 'Figma', icon: '🧩', type: 'app' },
        { name: 'Finder', icon: '📁', type: 'app' },
        { name: 'System Settings', icon: '⚙️', type: 'app' },
        { name: 'ChatGPT', icon: '🤖', type: 'url', url: 'https://chat.openai.com' },
        { name: 'Arc', icon: '🌀', type: 'app' },
        { name: 'Safari', icon: '🌐', type: 'app' }
      ]
    };
  }

  // 設定を読み込み
  load() {
    const saved = localStorage.getItem('iMouseSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.settings = { ...this.settings, ...parsed };
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }
    this.applyToUI();
  }

  // 設定を保存
  save() {
    try {
      localStorage.setItem('iMouseSettings', JSON.stringify(this.settings));
      console.log('Settings saved');
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }

  // 設定を取得
  get(path) {
    const keys = path.split('.');
    let value = this.settings;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  }

  // 設定を更新
  set(path, value) {
    const keys = path.split('.');
    let obj = this.settings;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    this.save();
  }

  // UIに設定を適用
  applyToUI() {
    // 接続設定
    const macIpInput = document.getElementById('macIp');
    const macPortInput = document.getElementById('macPort');
    if (macIpInput) macIpInput.value = this.settings.connection.ip;
    if (macPortInput) macPortInput.value = this.settings.connection.port;

    // カーソル設定
    this.updateRangeInput('cursorSpeed', this.settings.cursor.speed);
    const cursorAccel = document.getElementById('cursorAccel');
    if (cursorAccel) cursorAccel.value = this.settings.cursor.acceleration;

    // スクロール設定
    this.updateRangeInput('scrollSpeed', this.settings.scroll.speed);
    const scrollAccel = document.getElementById('scrollAccel');
    if (scrollAccel) scrollAccel.value = this.settings.scroll.acceleration;

    const inertiaScroll = document.getElementById('inertiaScroll');
    if (inertiaScroll) inertiaScroll.checked = this.settings.scroll.inertia;

    const naturalScroll = document.getElementById('naturalScroll');
    if (naturalScroll) naturalScroll.checked = this.settings.scroll.natural;

    // ジェスチャー設定
    this.updateRangeInput('tapSensitivity', this.settings.gestures.tapSensitivity);
    this.updateRangeInput('swipeThreshold', this.settings.gestures.swipeThreshold);

    // 振動設定
    const enableHaptics = document.getElementById('enableHaptics');
    if (enableHaptics) enableHaptics.checked = this.settings.haptics.enabled;
    this.updateRangeInput('hapticStrength', this.settings.haptics.strength);
  }

  // レンジ入力を更新
  updateRangeInput(id, value) {
    const input = document.getElementById(id);
    const display = document.getElementById(id + 'Value');
    if (input) input.value = value;
    if (display) display.textContent = value;
  }

  // UIから設定を読み取り
  readFromUI() {
    // 接続設定
    const macIp = document.getElementById('macIp')?.value || '';
    const macPort = parseInt(document.getElementById('macPort')?.value) || 8080;
    this.set('connection.ip', macIp);
    this.set('connection.port', macPort);

    // カーソル設定
    this.set('cursor.speed', parseInt(document.getElementById('cursorSpeed')?.value) || 5);
    this.set('cursor.acceleration', document.getElementById('cursorAccel')?.value || 'medium');

    // スクロール設定
    this.set('scroll.speed', parseInt(document.getElementById('scrollSpeed')?.value) || 5);
    this.set('scroll.acceleration', document.getElementById('scrollAccel')?.value || 'medium');
    this.set('scroll.inertia', document.getElementById('inertiaScroll')?.checked ?? true);
    this.set('scroll.natural', document.getElementById('naturalScroll')?.checked ?? true);

    // ジェスチャー設定
    this.set('gestures.tapSensitivity', parseInt(document.getElementById('tapSensitivity')?.value) || 5);
    this.set('gestures.swipeThreshold', parseInt(document.getElementById('swipeThreshold')?.value) || 5);

    // 振動設定
    this.set('haptics.enabled', document.getElementById('enableHaptics')?.checked ?? true);
    this.set('haptics.strength', parseInt(document.getElementById('hapticStrength')?.value) || 5);
  }

  // リセット
  reset() {
    if (confirm('本当に全ての設定をリセットしますか？')) {
      this.settings = this.getDefaultSettings();
      this.save();
      this.applyToUI();
      alert('設定をリセットしました');
    }
  }

  // 振動フィードバック
  haptic(intensity = 'medium') {
    if (!this.settings.haptics.enabled) {
      return;
    }

    if (!navigator.vibrate) {
      return;
    }

    const strength = this.settings.haptics.strength;
    let duration = 10;

    if (intensity === 'light') {
      duration = Math.floor(strength * 2);
    } else if (intensity === 'medium') {
      duration = Math.floor(strength * 5);
    } else if (intensity === 'heavy') {
      duration = Math.floor(strength * 10);
    }

    navigator.vibrate(duration);
  }
}

// グローバルインスタンス
const settingsManager = new SettingsManager();

// 設定モーダル制御
document.addEventListener('DOMContentLoaded', () => {
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettings = document.getElementById('closeSettings');
  const connectBtn = document.getElementById('connectBtn');
  const resetBtn = document.getElementById('resetSettings');

  // 設定モーダルを開く
  settingsBtn?.addEventListener('click', () => {
    settingsModal?.classList.add('active');
    settingsManager.applyToUI();
  });

  // 設定モーダルを閉じる
  closeSettings?.addEventListener('click', () => {
    settingsManager.readFromUI();
    settingsModal?.classList.remove('active');
  });

  // モーダル外クリックで閉じる
  settingsModal?.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsManager.readFromUI();
      settingsModal.classList.remove('active');
    }
  });

  // 接続ボタン
  connectBtn?.addEventListener('click', () => {
    const ip = document.getElementById('macIp')?.value;
    const port = parseInt(document.getElementById('macPort')?.value) || 8080;

    if (!ip) {
      alert('MacのIPアドレスを入力してください');
      return;
    }

    settingsManager.set('connection.ip', ip);
    settingsManager.set('connection.port', port);
    wsHandler.connect(ip, port);
  });

  // リセットボタン
  resetBtn?.addEventListener('click', () => {
    settingsManager.reset();
  });

  // レンジ入力の値表示を更新
  const rangeInputs = ['cursorSpeed', 'scrollSpeed', 'tapSensitivity', 'swipeThreshold', 'hapticStrength'];
  rangeInputs.forEach(id => {
    const input = document.getElementById(id);
    const display = document.getElementById(id + 'Value');
    input?.addEventListener('input', (e) => {
      if (display) display.textContent = e.target.value;
    });
  });

  // 自動接続（保存されたIPがある場合）
  setTimeout(() => {
    const savedIp = settingsManager.get('connection.ip');
    const savedPort = settingsManager.get('connection.port');
    if (savedIp) {
      console.log('Auto-connecting to saved IP...');
      wsHandler.connect(savedIp, savedPort);
    }
  }, 500);
});
