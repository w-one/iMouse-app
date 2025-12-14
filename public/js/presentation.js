/* ========================================
   iMouse 2.0 - プレゼンテーションモード
   ======================================== */

class PresentationMode {
  constructor() {
    this.currentSlide = 1;
    this.totalSlides = 0;
    this.timerRunning = false;
    this.timerSeconds = 0;
    this.timerInterval = null;
  }

  init() {
    this.setupEventListeners();
    this.requestPresentationInfo();
  }

  setupEventListeners() {
    const slideBtns = document.querySelectorAll('.slide-btn');
    const timerBtns = document.querySelectorAll('.timer-btn');
    const toolBtns = document.querySelectorAll('.tool-btn');

    // スライド操作
    slideBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.slideAction(btn.dataset.action);
      });
    });

    // タイマー操作
    timerBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.timerAction(btn.dataset.action);
      });
    });

    // プレゼンツール
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.toolAction(btn.dataset.action);
      });
    });

    // WebSocketメッセージリスナー
    wsHandler.on('presentationInfo', (data) => {
      this.updatePresentationInfo(data);
    });
  }

  // スライド操作
  slideAction(action) {
    settingsManager.haptic('medium');

    if (action === 'next') {
      this.currentSlide = Math.min(this.currentSlide + 1, this.totalSlides || 999);
    } else if (action === 'prev') {
      this.currentSlide = Math.max(this.currentSlide - 1, 1);
    }

    this.updateSlideCounter();

    wsHandler.send({
      type: 'presentation',
      action: action
    });
  }

  // タイマー操作
  timerAction(action) {
    settingsManager.haptic('light');

    if (action === 'start') {
      if (!this.timerRunning) {
        this.timerRunning = true;
        this.startTimer();
      }
    } else if (action === 'pause') {
      this.timerRunning = false;
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    } else if (action === 'reset') {
      this.timerRunning = false;
      this.timerSeconds = 0;
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      this.updateTimerDisplay();
    }
  }

  // タイマー開始
  startTimer() {
    this.timerInterval = setInterval(() => {
      if (this.timerRunning) {
        this.timerSeconds++;
        this.updateTimerDisplay();
      }
    }, 1000);
  }

  // タイマー表示更新
  updateTimerDisplay() {
    const minutes = Math.floor(this.timerSeconds / 60);
    const seconds = this.timerSeconds % 60;

    const minutesEl = document.getElementById('timerMinutes');
    const secondsEl = document.getElementById('timerSeconds');

    if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
    if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');

    // 警告（例: 30分超過）
    const timerDisplay = document.querySelector('.timer-display');
    if (this.timerSeconds > 1800) {
      timerDisplay?.classList.add('warning');
    } else {
      timerDisplay?.classList.remove('warning');
    }
  }

  // ツールアクション
  toolAction(action) {
    settingsManager.haptic('medium');

    wsHandler.send({
      type: 'presentation',
      action: action
    });

    // ビジュアルフィードバック
    if (action === 'black' || action === 'white') {
      this.showScreenOverlay(action);
    }
  }

  // スクリーンオーバーレイ表示
  showScreenOverlay(type) {
    let overlay = document.querySelector('.screen-overlay');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'screen-overlay';
      overlay.innerHTML = '<div class="screen-overlay-message">Tap to dismiss</div>';
      document.body.appendChild(overlay);

      overlay.addEventListener('click', () => {
        overlay.classList.remove('active');
        wsHandler.send({
          type: 'presentation',
          action: 'dismissOverlay'
        });
      });
    }

    overlay.className = `screen-overlay ${type}`;
    overlay.classList.add('active');
  }

  // プレゼンテーション情報をリクエスト
  requestPresentationInfo() {
    wsHandler.send({
      type: 'getPresentationInfo'
    });
  }

  // プレゼンテーション情報を更新
  updatePresentationInfo(data) {
    if (data.currentSlide !== undefined) {
      this.currentSlide = data.currentSlide;
    }
    if (data.totalSlides !== undefined) {
      this.totalSlides = data.totalSlides;
    }
    this.updateSlideCounter();
  }

  // スライドカウンター更新
  updateSlideCounter() {
    const currentEl = document.getElementById('currentSlide');
    const totalEl = document.getElementById('totalSlides');

    if (currentEl) currentEl.textContent = this.currentSlide;
    if (totalEl) totalEl.textContent = this.totalSlides || '--';
  }
}

// グローバルインスタンス
const presentationMode = new PresentationMode();

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  presentationMode.init();
});
