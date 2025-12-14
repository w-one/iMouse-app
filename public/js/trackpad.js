/* ========================================
   iMouse 2.0 - トラックパッド機能
   ======================================== */

class TrackpadHandler {
  constructor() {
    this.trackpadArea = null;
    this.touches = new Map();
    this.lastTouch = null;
    this.tapTimeout = null;
    this.longPressTimeout = null;
    this.isDragging = false;
    this.lastScrollTime = 0;
    this.scrollVelocity = { x: 0, y: 0 };
    this.inertiaAnimationFrame = null;
    this.lastPinchDistance = 0;
    this.gestureFeedback = null;
    this.pendingMove = { dx: 0, dy: 0 };
    this.moveFrame = null;
    this.lastTwoFingerCenter = null;
    this.lastTwoFingerPositions = null;
    this.twoFingerSwipeTriggered = false;
    this.inPinchMode = false;
    this.threeFingerHorizontalTriggered = false;
    this.threeFingerVerticalTriggered = false;
    this.clickFeedbackTimer = null;
    this.scrollStripActive = false;
    this.scrollStripLastY = 0;
  }

  init() {
    this.trackpadArea = document.getElementById('trackpad');
    this.gestureFeedback = document.getElementById('gestureFeedback');

    if (!this.trackpadArea) {
      console.error('Trackpad area not found');
      return;
    }

    // タッチイベント
    this.trackpadArea.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.trackpadArea.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.trackpadArea.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.trackpadArea.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });

    this.setupScrollStrip();
    this.setupMouseButtons();

    console.log('Trackpad initialized');
  }

  setupScrollStrip() {
    this.scrollStrip = document.getElementById('scrollStrip');
    if (!this.scrollStrip) return;

    const handleStart = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!e.touches?.length) return;
      this.scrollStripActive = true;
      this.scrollStripLastY = e.touches[0].clientY;
    };

    const handleMove = (e) => {
      if (!this.scrollStripActive) return;
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      const dy = touch.clientY - this.scrollStripLastY;
      if (Math.abs(dy) > 0.5) {
        this.scroll(0, dy * 1.5);
        this.scrollStripLastY = touch.clientY;
      }
    };

    const handleEnd = () => {
      this.scrollStripActive = false;
    };

    const stop = (e) => e.stopPropagation();

    this.scrollStrip.addEventListener('touchstart', handleStart, { passive: false });
    this.scrollStrip.addEventListener('touchmove', handleMove, { passive: false });
    this.scrollStrip.addEventListener('touchend', handleEnd);
    this.scrollStrip.addEventListener('touchcancel', handleEnd);
    this.scrollStrip.addEventListener('touchstart', stop, { passive: false });
    this.scrollStrip.addEventListener('touchmove', stop, { passive: false });
    this.scrollStrip.addEventListener('touchend', stop);
    this.scrollStrip.addEventListener('touchcancel', stop);
  }

  setupMouseButtons() {
    const bind = (id, handler) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const trigger = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handler();
      };
      btn.addEventListener('touchstart', trigger);
      btn.addEventListener('mousedown', trigger);
      btn.addEventListener('click', trigger);
    };

    bind('leftClickBtn', () => this.click());
    bind('rightClickBtn', () => this.rightClick());
  }

  // タッチ開始
  handleTouchStart(e) {
    e.preventDefault();

    const touchCount = e.touches.length;

    // タッチ情報を保存
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      this.touches.set(touch.identifier, {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startTime: Date.now()
      });
    }

    // 1本指タップ - 長押しでドラッグ開始
    if (touchCount === 1) {
      this.longPressTimeout = setTimeout(() => {
        this.startDrag();
      }, 500);
    }
    if (touchCount === 2) {
      this.twoFingerSwipeTriggered = false;
      this.lastTwoFingerCenter = null;
      this.lastPinchDistance = 0;
      this.lastTwoFingerPositions = null;
      this.inPinchMode = false;
    }
    if (touchCount === 3) {
      this.threeFingerHorizontalTriggered = false;
      this.threeFingerVerticalTriggered = false;
    }

    // フィードバック
    this.showTouchFeedback(e.touches[0].clientX, e.touches[0].clientY);
  }

  // タッチ移動
  handleTouchMove(e) {
    e.preventDefault();

    const touchCount = e.touches.length;

    // タッチ情報を更新
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const stored = this.touches.get(touch.identifier);
      if (stored) {
        stored.currentX = touch.clientX;
        stored.currentY = touch.clientY;
      }
    }

    // 長押しタイマーをキャンセル（移動が開始されたら）
    if (this.longPressTimeout) {
      const touch = Array.from(this.touches.values())[0];
      const dx = touch.currentX - touch.startX;
      const dy = touch.currentY - touch.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 10) {
        clearTimeout(this.longPressTimeout);
        this.longPressTimeout = null;
      }
    }

    // 1本指 - カーソル移動 or ドラッグ
    if (touchCount === 1) {
      const touch = Array.from(this.touches.values())[0];
      
      // lastTouchが存在する場合のみ移動量を計算
      if (this.lastTouch) {
        const dx = touch.currentX - this.lastTouch.currentX;
        const dy = touch.currentY - this.lastTouch.currentY;

        // 移動量が閾値以上の場合のみ送信
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          if (this.isDragging) {
            // ドラッグ中は移動のみ（moveCursorは自動的に送信される）
            this.moveCursor(dx, dy);
          } else {
            // 通常のカーソル移動
            this.moveCursor(dx, dy);
          }
        }
      }
      
      // lastTouchを更新
      this.lastTouch = {
        currentX: touch.currentX,
        currentY: touch.currentY
      };
    }

    // 2本指 - スクロール or ズーム
    else if (touchCount === 2) {
      const touches = Array.from(this.touches.values());
      const touch1 = touches[0];
      const touch2 = touches[1];

      // ピンチジェスチャー検出
      const distance = this.getDistance(
        touch1.currentX, touch1.currentY,
        touch2.currentX, touch2.currentY
      );

      const centerX = (touch1.currentX + touch2.currentX) / 2;
      const centerY = (touch1.currentY + touch2.currentY) / 2;
      const prevCenter = this.lastTwoFingerCenter || { x: centerX, y: centerY };
      const deltaX = centerX - prevCenter.x;
      const deltaY = centerY - prevCenter.y;

      const prevPositions = this.lastTwoFingerPositions || {
        touch1: { x: touch1.currentX, y: touch1.currentY },
        touch2: { x: touch2.currentX, y: touch2.currentY }
      };
      const move1 = {
        x: touch1.currentX - prevPositions.touch1.x,
        y: touch1.currentY - prevPositions.touch1.y
      };
      const move2 = {
        x: touch2.currentX - prevPositions.touch2.x,
        y: touch2.currentY - prevPositions.touch2.y
      };

      const sameDirection = (Math.sign(move1.x) === Math.sign(move2.x) || Math.abs(move1.x) < 0.2 || Math.abs(move2.x) < 0.2) &&
        (Math.sign(move1.y) === Math.sign(move2.y) || Math.abs(move1.y) < 0.2 || Math.abs(move2.y) < 0.2);

      const pinchThreshold = 6;
      const pinchDelta = this.lastPinchDistance > 0 ? distance - this.lastPinchDistance : 0;
      const pinchMagnitude = Math.abs(pinchDelta);
      const movementMagnitude = Math.max(
        Math.abs(move1.x) + Math.abs(move1.y),
        Math.abs(move2.x) + Math.abs(move2.y)
      );

      if (!this.inPinchMode && this.lastPinchDistance > 0) {
        if (pinchMagnitude > pinchThreshold && (!sameDirection || pinchMagnitude > movementMagnitude * 0.8)) {
          this.inPinchMode = true;
          this.twoFingerSwipeTriggered = false;
        }
      }

      if (this.inPinchMode) {
        if (Math.abs(pinchDelta) > 1) {
          this.handlePinch(pinchDelta);
        }
      } else {
        const swipeThreshold = 70;
        const isHorizontalDominant = Math.abs(deltaX) > Math.abs(deltaY);

        if (!this.twoFingerSwipeTriggered && isHorizontalDominant && Math.abs(deltaX) > swipeThreshold) {
          this.twoFingerSwipeTriggered = true;
          if (deltaX < 0) {
            this.triggerBrowserNavigation('back');
          } else {
            this.triggerBrowserNavigation('forward');
          }
        } else if (!this.twoFingerSwipeTriggered) {
          if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
            this.scroll(deltaX, deltaY);
          }
        }
      }

      this.lastPinchDistance = distance;
      this.lastTwoFingerCenter = { x: centerX, y: centerY };
      this.lastTwoFingerPositions = {
        touch1: { x: touch1.currentX, y: touch1.currentY },
        touch2: { x: touch2.currentX, y: touch2.currentY }
      };
      this.lastTouch = {
        currentX: centerX,
        currentY: centerY
      };
    }

    // 3本指 - Mission Control / App Exposé
    else if (touchCount === 3) {
      const touches = Array.from(this.touches.values());
      const avgY = touches.reduce((sum, t) => sum + t.currentY, 0) / 3;
      const startAvgY = touches.reduce((sum, t) => sum + t.startY, 0) / 3;
      const deltaY = avgY - startAvgY;

      const horizontalThreshold = 100;
      const verticalThreshold = 100;
      const isVerticalDominant = Math.abs(deltaY) > Math.abs(deltaX);

      if (!this.threeFingerVerticalTriggered && isVerticalDominant && Math.abs(deltaY) > verticalThreshold) {
        this.threeFingerVerticalTriggered = true;
        if (deltaY < 0) {
          this.showGestureFeedback('⬆️');
          this.sendGesture('missionControl');
        } else {
          this.showGestureFeedback('⬇️');
          this.sendGesture('appExpose');
        }
      } else if (!this.threeFingerHorizontalTriggered && Math.abs(deltaX) > horizontalThreshold) {
        this.threeFingerHorizontalTriggered = true;
        if (deltaX < 0) {
          this.showGestureFeedback('⬅️');
          this.sendGesture('desktopLeft');
        } else {
          this.showGestureFeedback('➡️');
          this.sendGesture('desktopRight');
        }
      }
    }

    // 4本指 - デスクトップ切替
    else if (touchCount === 4) {
      const touches = Array.from(this.touches.values());
      const avgX = touches.reduce((sum, t) => sum + t.currentX, 0) / 4;
      const startAvgX = touches.reduce((sum, t) => sum + t.startX, 0) / 4;
      const deltaX = avgX - startAvgX;

      if (Math.abs(deltaX) > 100) {
        if (deltaX < 0) {
          this.showGestureFeedback('⬅️');
          this.sendGesture('desktopLeft');
        } else {
          this.showGestureFeedback('➡️');
          this.sendGesture('desktopRight');
        }
        this.touches.clear();
      }
    }
  }

  // タッチ終了
  handleTouchEnd(e) {
    e.preventDefault();

    // タイマーをクリア
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }

    const touchCount = this.touches.size;

    // タップ検出
    if (touchCount === 1 && !this.isDragging) {
      const touch = Array.from(this.touches.values())[0];
      const duration = Date.now() - touch.startTime;
      const dx = touch.currentX - touch.startX;
      const dy = touch.currentY - touch.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // タップと判定
      if (duration < 200 && distance < 10) {
        this.click();
      }
    }

    // 2本指タップ - 右クリック
    else if (touchCount === 2 && e.touches.length === 0) {
      const touches = Array.from(this.touches.values());
      const maxDuration = Math.max(...touches.map(t => Date.now() - t.startTime));

      if (maxDuration < 200) {
        this.rightClick();
      }
    }

    // ドラッグ終了
    if (this.isDragging && e.touches.length === 0) {
      this.endDrag();
    }

    // 慣性スクロール開始
    if (touchCount === 2 && e.touches.length === 0 && !this.twoFingerSwipeTriggered) {
      this.startInertiaScroll();
    }

    // タッチ情報をクリア
    for (let i = 0; i < e.changedTouches.length; i++) {
      this.touches.delete(e.changedTouches[i].identifier);
    }

    if (this.touches.size < 2) {
      this.lastTwoFingerCenter = null;
      this.twoFingerSwipeTriggered = false;
      this.lastPinchDistance = 0;
      this.lastTwoFingerPositions = null;
      this.inPinchMode = false;
    }
    if (this.touches.size < 3) {
      this.threeFingerHorizontalTriggered = false;
      this.threeFingerVerticalTriggered = false;
    }

    if (e.touches.length === 0) {
      this.touches.clear();
      this.lastTouch = null;
      this.lastPinchDistance = 0;
    }
  }

  // カーソル移動（改善版 + スロットリング）
  moveCursor(dx, dy) {
    // 値の検証
    if (dx === undefined || dy === undefined || isNaN(dx) || isNaN(dy)) {
      return;
    }

    // 微小なノイズは無視
    if (Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2) {
      return;
    }

    this.pendingMove.dx += dx;
    this.pendingMove.dy += dy;

    if (!this.moveFrame) {
      this.moveFrame = window.requestAnimationFrame(() => this.flushPendingMove());
    }
  }

  flushPendingMove() {
    this.moveFrame = null;
    const moveDx = this.pendingMove.dx;
    const moveDy = this.pendingMove.dy;
    this.pendingMove = { dx: 0, dy: 0 };

    if (Math.abs(moveDx) < 0.1 && Math.abs(moveDy) < 0.1) {
      return;
    }

    try {
      const speed = settingsManager.get('cursor.speed') || 5;
      const accel = settingsManager.get('cursor.acceleration') || 'medium';

      let multiplier = speed / 5;

      // 加速度
      if (accel === 'low') multiplier *= 1.2;
      else if (accel === 'medium') multiplier *= 1.5;
      else if (accel === 'high') multiplier *= 2.0;

      // 最終的な移動量を計算
      const finalDx = moveDx * multiplier;
      const finalDy = moveDy * multiplier;

      // 異常に大きな値は制限
      const maxMove = 80;
      const limitedDx = Math.max(-maxMove, Math.min(maxMove, finalDx));
      const limitedDy = Math.max(-maxMove, Math.min(maxMove, finalDy));

      // WebSocketに送信
      if (wsHandler && wsHandler.isConnected()) {
        wsHandler.send({
          type: 'move',
          dx: limitedDx,
          dy: limitedDy
        });
      }
    } catch (err) {
      console.error('Move cursor error:', err);
    }
  }

  // クリック
  click() {
    settingsManager.haptic('light');
    this.showGestureFeedback('👆');
    this.pulseClickFeedback('base');
    wsHandler.send({ type: 'click' });
  }

  // 右クリック
  rightClick() {
    settingsManager.haptic('medium');
    this.showGestureFeedback('👆👆');
    this.pulseClickFeedback('strong');
    wsHandler.send({ type: 'rightClick' });
  }

  // ドラッグ開始
  startDrag() {
    this.isDragging = true;
    settingsManager.haptic('heavy');
    this.trackpadArea.classList.add('dragging');
    wsHandler.send({ type: 'dragStart' });
  }

  triggerBrowserNavigation(direction) {
    const gesture = direction === 'forward' ? 'browserForward' : 'browserBack';
    const emoji = direction === 'forward' ? '↪️' : '↩️';
    this.showGestureFeedback(emoji);
    this.sendGesture(gesture, {
      preserveTouches: true,
      haptic: 'medium'
    });
  }

  // ドラッグ終了
  endDrag() {
    this.isDragging = false;
    settingsManager.haptic('medium');
    this.trackpadArea.classList.remove('dragging');
    wsHandler.send({ type: 'dragEnd' });
  }

  // スクロール
  scroll(dx, dy) {
    const speed = settingsManager.get('scroll.speed');
    const natural = settingsManager.get('scroll.natural');
    const accel = settingsManager.get('scroll.acceleration');

    let multiplier = speed / 5;

    // 加速度
    if (accel === 'low') multiplier *= 1.2;
    else if (accel === 'medium') multiplier *= 1.5;
    else if (accel === 'high') multiplier *= 2.0;

    const scrollX = dx * multiplier * (natural ? -1 : 1);
    const scrollY = dy * multiplier * (natural ? -1 : 1);

    this.scrollVelocity = { x: scrollX, y: scrollY };
    this.lastScrollTime = Date.now();

    wsHandler.send({
      type: 'scroll',
      dx: scrollX,
      dy: scrollY
    });
  }

  // 慣性スクロール
  startInertiaScroll() {
    if (!settingsManager.get('scroll.inertia')) {
      return;
    }

    const decay = 0.95;
    const threshold = 0.1;

    const animate = () => {
      this.scrollVelocity.x *= decay;
      this.scrollVelocity.y *= decay;

      if (Math.abs(this.scrollVelocity.x) > threshold || Math.abs(this.scrollVelocity.y) > threshold) {
        wsHandler.send({
          type: 'scroll',
          dx: this.scrollVelocity.x,
          dy: this.scrollVelocity.y
        });
        this.inertiaAnimationFrame = requestAnimationFrame(animate);
      }
    };

    if (this.inertiaAnimationFrame) {
      cancelAnimationFrame(this.inertiaAnimationFrame);
    }

    this.inertiaAnimationFrame = requestAnimationFrame(animate);
  }

  // ピンチ（ズーム）
  handlePinch(delta) {
    settingsManager.haptic('light');
    this.showGestureFeedback(delta > 0 ? '🔍+' : '🔍-');
    wsHandler.send({
      type: 'zoom',
      delta: delta
    });
  }

  // ジェスチャー送信
  sendGesture(gesture, options = {}) {
    const { preserveTouches = false, haptic = 'medium' } = options;
    settingsManager.haptic(haptic);
    wsHandler.send({
      type: 'gesture',
      gesture: gesture
    });
    if (!preserveTouches) {
      this.touches.clear();
      this.lastTouch = null;
      this.lastPinchDistance = 0;
      this.lastTwoFingerCenter = null;
      this.twoFingerSwipeTriggered = false;
      this.threeFingerHorizontalTriggered = false;
      this.threeFingerVerticalTriggered = false;
    }
  }

  // タッチフィードバック表示
  showTouchFeedback(x, y) {
    const feedback = document.createElement('div');
    feedback.className = 'touch-feedback';
    feedback.style.left = `${x}px`;
    feedback.style.top = `${y}px`;
    this.trackpadArea.appendChild(feedback);

    setTimeout(() => {
      feedback.remove();
    }, 600);
  }

  // ジェスチャーフィードバック表示
  showGestureFeedback(emoji) {
    if (!this.gestureFeedback) return;

    this.gestureFeedback.textContent = emoji;
    this.gestureFeedback.classList.add('active');

    setTimeout(() => {
      this.gestureFeedback.classList.remove('active');
    }, 500);
  }

  pulseClickFeedback(strength = 'base') {
    if (!this.trackpadArea) return;
    const className = strength === 'strong' ? 'click-feedback-strong' : 'click-feedback';
    this.trackpadArea.classList.remove('click-feedback', 'click-feedback-strong');
    void this.trackpadArea.offsetWidth;
    this.trackpadArea.classList.add(className);
    clearTimeout(this.clickFeedbackTimer);
    this.clickFeedbackTimer = setTimeout(() => {
      this.trackpadArea.classList.remove('click-feedback', 'click-feedback-strong');
    }, 180);
  }

  // 2点間の距離
  getDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// グローバルインスタンス
const trackpadHandler = new TrackpadHandler();

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  trackpadHandler.init();
});
