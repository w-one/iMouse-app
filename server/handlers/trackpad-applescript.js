/* ========================================
   iMouse 2.0 - トラックパッドハンドラー (AppleScript版)
   ======================================== */

const { exec } = require('child_process');

class TrackpadHandler {
  constructor(config) {
    this.config = config;
    this.isDragging = false;
    this.mouseSpeed = config.cursor?.speedMultiplier || 1.0;
    this.currentX = 0;
    this.currentY = 0;

    console.log('✅ Trackpad handler initialized (AppleScript)');
  }

  // カーソル移動
  move(dx, dy) {
    if (!dx && !dy) return;

    try {
      // 相対移動をシミュレート
      const script = `
        tell application "System Events"
          set currentPos to do shell script "osascript -e 'tell application \\"System Events\\" to return (do shell script \\"echo \\" & (item 1 of (get position of mouse))\\"')'"
          set currentX to (currentPos as number)
          set currentY to (do shell script "osascript -e 'tell application \\"System Events\\" to return (do shell script \\"echo \\" & (item 2 of (get position of mouse))\\"')'") as number

          set newX to currentX + (${dx * this.mouseSpeed})
          set newY to currentY + (${dy * this.mouseSpeed})

          set the position of mouse to {newX, newY}
        end tell
      `;

      // より簡潔な実装
      const simpleScript = `
        tell application "System Events"
          key code 124 using {shift down}
        end tell
      `;

      // cliclickを使う方が確実（別途インストール必要）
      // exec(`cliclick m:+${dx},+${dy}`, () => {});

      // Python経由でマウス移動
      const pythonScript = `
import Quartz
import time

def move_mouse_relative(dx, dy):
    current_pos = Quartz.NSEvent.mouseLocation()
    x = current_pos.x + ${dx * this.mouseSpeed}
    y = Quartz.NSScreen.mainScreen().frame().size.height - current_pos.y + ${dy * this.mouseSpeed}

    Quartz.CGWarpMouseCursorPosition((x, Quartz.NSScreen.mainScreen().frame().size.height - y))

move_mouse_relative(${dx * this.mouseSpeed}, ${dy * this.mouseSpeed})
      `;

      exec(`python3 -c '${pythonScript}'`, (error) => {
        if (error && error.code !== 0) {
          // Fallback: osascriptでマウス位置を設定
          exec(`osascript -e 'tell application "System Events" to return position of mouse'`, (err, stdout) => {
            if (!err && stdout) {
              const pos = stdout.trim().split(', ').map(Number);
              const newX = Math.round(pos[0] + dx * this.mouseSpeed);
              const newY = Math.round(pos[1] + dy * this.mouseSpeed);
              exec(`osascript -e 'tell application "System Events" to set position of mouse to {${newX}, ${newY}}'`);
            }
          });
        }
      });

    } catch (err) {
      console.error('Move error:', err.message);
    }
  }

  // クリック
  click() {
    try {
      const script = `tell application "System Events" to click at (do shell script "osascript -e 'tell application \\"System Events\\" to return position of mouse'")`;

      exec(`osascript -e 'tell application "System Events" to click at (position of mouse)'`, (error) => {
        if (error) {
          // Fallback
          exec(`osascript -e 'tell application "System Events" to keystroke return'`);
        }
      });
    } catch (err) {
      console.error('Click error:', err.message);
    }
  }

  // 右クリック
  rightClick() {
    try {
      exec(`osascript -e 'tell application "System Events" to right click at (position of mouse)'`);
    } catch (err) {
      console.error('Right click error:', err.message);
    }
  }

  // スクロール
  scroll(dx, dy) {
    try {
      // スクロールホイールをシミュレート
      const scrollAmount = Math.round(dy);

      if (Math.abs(scrollAmount) > 0) {
        const script = `
          tell application "System Events"
            repeat ${Math.abs(scrollAmount)} times
              key code ${scrollAmount > 0 ? '125' : '126'}
            end repeat
          end tell
        `;

        exec(`osascript -e '${script}'`);
      }
    } catch (err) {
      console.error('Scroll error:', err.message);
    }
  }

  // ズーム
  zoom(delta) {
    try {
      if (delta > 0) {
        exec(`osascript -e 'tell application "System Events" to keystroke "=" using command down'`);
      } else {
        exec(`osascript -e 'tell application "System Events" to keystroke "-" using command down'`);
      }
    } catch (err) {
      console.error('Zoom error:', err.message);
    }
  }

  // ドラッグ開始
  dragStart() {
    try {
      this.isDragging = true;
      exec(`osascript -e 'tell application "System Events" to mouse down at (position of mouse)'`);
    } catch (err) {
      console.error('Drag start error:', err.message);
    }
  }

  // ドラッグ終了
  dragEnd() {
    try {
      this.isDragging = false;
      exec(`osascript -e 'tell application "System Events" to mouse up at (position of mouse)'`);
    } catch (err) {
      console.error('Drag end error:', err.message);
    }
  }

  // ジェスチャー
  gesture(type) {
    try {
      const gestures = {
        'missionControl': 'key code 126 using control down',
        'appExpose': 'key code 125 using control down',
        'desktopLeft': 'key code 123 using control down',
        'desktopRight': 'key code 124 using control down',
        'showDesktop': 'key code 103'
      };

      const script = gestures[type];
      if (script) {
        exec(`osascript -e 'tell application "System Events" to ${script}'`);
      }
    } catch (err) {
      console.error('Gesture error:', err.message);
    }
  }
}

module.exports = TrackpadHandler;
