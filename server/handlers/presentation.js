/* ========================================
   iMouse 2.0 - プレゼンテーションハンドラー
   ======================================== */

const robot = require('robotjs');
const { exec } = require('child_process');

class PresentationHandler {
  constructor(config) {
    this.config = config;
    this.currentSlide = 1;
    this.totalSlides = 0;
    this.overlayActive = false;

    console.log('✅ Presentation handler initialized');
  }

  // アクション処理
  handleAction(action, params = {}) {
    try {
      switch (action) {
        case 'next':
          this.nextSlide();
          break;

        case 'prev':
          this.prevSlide();
          break;

        case 'black':
          this.blackScreen();
          break;

        case 'white':
          this.whiteScreen();
          break;

        case 'notes':
          this.showNotes();
          break;

        case 'dismissOverlay':
          this.dismissOverlay();
          break;

        default:
          console.warn('Unknown presentation action:', action);
      }
    } catch (err) {
      console.error('Presentation action error:', err.message);
    }
  }

  // 次のスライド
  nextSlide() {
    try {
      // 一般的なプレゼンソフトでは右矢印キーまたはスペースキー
      robot.keyTap('right');
      this.currentSlide++;
      console.log(`➡️  Next slide (${this.currentSlide})`);
    } catch (err) {
      console.error('Next slide error:', err.message);
    }
  }

  // 前のスライド
  prevSlide() {
    try {
      robot.keyTap('left');
      if (this.currentSlide > 1) {
        this.currentSlide--;
      }
      console.log(`⬅️  Previous slide (${this.currentSlide})`);
    } catch (err) {
      console.error('Previous slide error:', err.message);
    }
  }

  // ブラックスクリーン
  blackScreen() {
    try {
      // Keynote: B, PowerPoint: B or .
      robot.keyTap('b');
      this.overlayActive = !this.overlayActive;
      console.log(`⬛ Black screen: ${this.overlayActive ? 'ON' : 'OFF'}`);
    } catch (err) {
      console.error('Black screen error:', err.message);
    }
  }

  // ホワイトスクリーン
  whiteScreen() {
    try {
      // Keynote: W, PowerPoint: W or ,
      robot.keyTap('w');
      this.overlayActive = !this.overlayActive;
      console.log(`⬜ White screen: ${this.overlayActive ? 'ON' : 'OFF'}`);
    } catch (err) {
      console.error('White screen error:', err.message);
    }
  }

  // ノート表示
  showNotes() {
    try {
      // Keynote: Option + P (発表者ディスプレイ)
      robot.keyTap('p', ['alt']);
      console.log(`📝 Show notes`);
    } catch (err) {
      console.error('Show notes error:', err.message);
    }
  }

  // オーバーレイ解除
  dismissOverlay() {
    try {
      // Escキーで解除
      robot.keyTap('escape');
      this.overlayActive = false;
      console.log(`✕ Dismiss overlay`);
    } catch (err) {
      console.error('Dismiss overlay error:', err.message);
    }
  }

  // プレゼン開始
  startPresentation() {
    try {
      // Keynote: Option + Cmd + P
      // PowerPoint: F5
      robot.keyTap('p', ['alt', 'command']);
      console.log(`▶️  Start presentation`);
    } catch (err) {
      console.error('Start presentation error:', err.message);
    }
  }

  // プレゼン終了
  endPresentation() {
    try {
      robot.keyTap('escape');
      console.log(`⏹️  End presentation`);
    } catch (err) {
      console.error('End presentation error:', err.message);
    }
  }

  // スライド情報を取得
  getInfo() {
    // 実際のスライド情報はプレゼンソフトから取得する必要がある
    // ここでは簡易実装
    return {
      currentSlide: this.currentSlide,
      totalSlides: this.totalSlides
    };
  }

  // スライド数を設定（外部から）
  setTotalSlides(total) {
    this.totalSlides = total;
  }

  // 特定のスライドへジャンプ
  jumpToSlide(slideNumber) {
    try {
      // スライド番号を入力してEnter
      const slideStr = slideNumber.toString();
      for (const char of slideStr) {
        robot.keyTap(char);
      }
      robot.keyTap('enter');

      this.currentSlide = slideNumber;
      console.log(`🎯 Jump to slide ${slideNumber}`);
    } catch (err) {
      console.error('Jump to slide error:', err.message);
    }
  }
}

module.exports = PresentationHandler;
