/* ========================================
   iMouse 2.0 - メインアプリケーション
   ======================================== */

class iMouseApp {
  constructor() {
    this.currentMode = 'trackpad';
    this.panelOpen = false;
  }

  init() {
    console.log('iMouse 2.0 Starting...');

    this.setupNavigation();
    this.setupShortcuts();
    this.preventDefaultBehaviors();

    console.log('iMouse 2.0 Ready!');
  }

  // ナビゲーション設定
  setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const slidePanel = document.getElementById('slidePanel');
    const panelCloses = document.querySelectorAll('.panel-close');

    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.switchMode(mode);
      });
    });

    // パネルを閉じる
    panelCloses.forEach(btn => {
      btn.addEventListener('click', () => {
        this.closePanel();
      });
    });

    // スワイプダウンでパネルを閉じる
    let panelStartY = 0;
    slidePanel?.addEventListener('touchstart', (e) => {
      panelStartY = e.touches[0].clientY;
    });

    slidePanel?.addEventListener('touchmove', (e) => {
      const deltaY = e.touches[0].clientY - panelStartY;
      if (deltaY > 50 && e.target === slidePanel) {
        this.closePanel();
      }
    });
  }

  // モード切替
  switchMode(mode) {
    console.log('Switching to mode:', mode);

    // ナビゲーションボタンの状態更新
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // トラックパッドモードの場合はパネルを閉じる
    if (mode === 'trackpad') {
      this.closePanel();
      this.currentMode = mode;
      return;
    }

    // その他のモードの場合はパネルを開く
    this.openPanel(mode);
    this.currentMode = mode;

    // 振動フィードバック
    settingsManager.haptic('light');
  }

  // パネルを開く
  openPanel(mode) {
    const slidePanel = document.getElementById('slidePanel');
    const panels = document.querySelectorAll('.panel-content');

    // 全てのパネルを非表示
    panels.forEach(panel => {
      panel.classList.remove('active');
    });

    // 指定されたパネルを表示
    const targetPanel = document.querySelector(`[data-panel="${mode}"]`);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }

    // スライドパネルを開く
    slidePanel?.classList.add('active');
    this.panelOpen = true;
  }

  // パネルを閉じる
  closePanel() {
    const slidePanel = document.getElementById('slidePanel');
    slidePanel?.classList.remove('active');
    this.panelOpen = false;

    // トラックパッドモードに戻る
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === 'trackpad');
    });
    this.currentMode = 'trackpad';
  }

  // ショートカットキー設定
  setupShortcuts() {
    const shortcutBtns = document.querySelectorAll('.shortcut-btn');

    shortcutBtns.forEach(btn => {
      const stop = (e) => {
        e.stopPropagation();
      };
      btn.addEventListener('touchstart', stop, { passive: false });
      btn.addEventListener('touchmove', stop, { passive: false });
      btn.addEventListener('click', () => {
        const gesture = btn.dataset.gesture;
        const shortcut = btn.dataset.shortcut;
        if (gesture) {
          this.executeGestureShortcut(gesture);
        } else if (shortcut) {
          this.executeShortcut(shortcut);
        }
      });
    });
  }

  // ショートカット実行
  executeShortcut(shortcut) {
    console.log('Executing shortcut:', shortcut);
    settingsManager.haptic('medium');

    wsHandler.send({
      type: 'shortcut',
      shortcut: shortcut
    });

    // ビジュアルフィードバック
    this.showShortcutFeedback(shortcut);
  }

  // ショートカットフィードバック
  showShortcutFeedback(shortcut) {
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: fixed;
      top: 70px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 122, 255, 0.9);
      color: white;
      padding: 10px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      z-index: 9999;
      animation: slideDown 0.5s ease-out;
    `;
    feedback.textContent = shortcut.toUpperCase();
    document.body.appendChild(feedback);

    setTimeout(() => {
      feedback.style.animation = 'slideUp 0.5s ease-out';
      setTimeout(() => feedback.remove(), 500);
    }, 1000);
  }

  executeGestureShortcut(gesture) {
    console.log('Executing gesture shortcut:', gesture);
    settingsManager.haptic('medium');

    wsHandler.send({
      type: 'gesture',
      gesture
    });

    this.showShortcutFeedback(gesture);
  }

  // デフォルト動作を防止
  preventDefaultBehaviors() {
    // ダブルタップズームを防止
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);

    // ピンチズームを防止（トラックパッド以外）
    document.addEventListener('gesturestart', (e) => {
      if (!e.target.closest('#trackpad')) {
        e.preventDefault();
      }
    });

    // コンテキストメニューを防止
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // 選択を防止
    document.addEventListener('selectstart', (e) => {
      if (!e.target.matches('input, textarea')) {
        e.preventDefault();
      }
    });
  }
}

// アニメーション定義
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @keyframes slideUp {
    from {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    to {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
  }

  @keyframes fadeInOut {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.8);
    }
    20% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    80% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.8);
    }
  }
`;
document.head.appendChild(style);

// グローバルインスタンス
const app = new iMouseApp();

// アプリ起動
document.addEventListener('DOMContentLoaded', () => {
  app.init();

  // iOS PWAチェック
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

  if (isIOS && !isStandalone) {
    console.log('💡 Tip: Add to Home Screen for best experience!');
  }

  // デバッグ情報
  console.log('Device:', navigator.userAgent);
  console.log('Screen:', window.screen.width, 'x', window.screen.height);
  console.log('Viewport:', window.innerWidth, 'x', window.innerHeight);
});

// エラーハンドリング
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});
