/* ========================================
   iMouse 2.0 - トラックパッドハンドラー (Workerブリッジ)
   ======================================== */

class TrackpadHandler {
  constructor(config, workerBridge) {
    this.config = config;
    this.worker = workerBridge;
    this.dragActive = false;
  }

  send(type, payload = {}) {
    if (!this.worker) return;
    this.worker.send(type, payload);
  }

  move(dx, dy) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    this.send('move', { dx, dy });
  }

  click() {
    this.send('click');
  }

  rightClick() {
    this.send('rightClick');
  }

  scroll(dx, dy) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    this.send('scroll', { dx, dy });
  }

  zoom(delta) {
    if (!Number.isFinite(delta)) return;
    this.send('zoom', { delta });
  }

  dragStart() {
    if (this.dragActive) return;
    this.dragActive = true;
    this.send('dragStart');
  }

  dragEnd() {
    if (!this.dragActive) return;
    this.dragActive = false;
    this.send('dragEnd');
  }

  gesture(gesture) {
    if (!gesture) return;
    this.send('gesture', { gesture });
  }
}

module.exports = TrackpadHandler;
