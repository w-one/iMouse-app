/* ========================================
   iMouse 2.0 - キーボードハンドラー
   ======================================== */

const robot = require('robotjs');
const { exec } = require('child_process');

class KeyboardHandler {
  constructor(config) {
    this.config = config;
    this.currentLang = 'EN';
    console.log('✅ Keyboard handler initialized');
  }

  // テキスト入力
  typeText(text, modifiers = []) {
    if (!text) return;

    try {
      // 日本語や特殊文字を含むかチェック
      const hasNonASCII = /[^\x00-\x7F]/.test(text);

      if (hasNonASCII) {
        // 日本語や特殊文字はクリップボード経由で入力
        this.typeViaClipboard(text);
      } else if (modifiers && modifiers.length > 0) {
        // 修飾キーありの場合は1文字ずつ
        const robotModifiers = this.convertModifiers(modifiers);
        for (const char of text) {
          try {
            robot.keyTap(char, robotModifiers);
          } catch (err) {
            // エラーが出た文字はスキップ
            console.warn(`Skipping character: ${char}`);
          }
        }
      } else {
        // ASCII文字のみの場合はrobotjsで直接入力
        robot.typeString(text);
      }

      console.log(`⌨️  Typed: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
    } catch (err) {
      console.error('Type text error:', err.message);
    }
  }

  // クリップボード経由でテキスト入力（日本語対応）
  typeViaClipboard(text) {
    try {
      // エスケープ処理
      const escapedText = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

      // AppleScriptでクリップボードに保存してペースト
      const script = `
        set the clipboard to "${escapedText}"
        tell application "System Events"
          keystroke "v" using command down
        end tell
      `;

      exec(`osascript -e '${script}'`, (error) => {
        if (error) {
          console.error('Clipboard paste error:', error.message);
        }
      });
    } catch (err) {
      console.error('Clipboard error:', err.message);
    }
  }

  // 1文字入力
  typeKey(key, modifiers = []) {
    try {
      // ASCII以外の文字はクリップボード経由で
      if (/[^\x00-\x7F]/.test(key)) {
        this.typeViaClipboard(key);
        return;
      }

      const robotModifiers = this.convertModifiers(modifiers);
      robot.keyTap(key, robotModifiers);
    } catch (err) {
      console.error('Type key error:', err.message);
      // エラーが出た場合もクリップボード経由を試す
      if (key.length === 1) {
        this.typeViaClipboard(key);
      }
    }
  }

  // 特殊キー
  specialKey(action, key) {
    try {
      const keyMap = {
        'enter': 'enter',
        'tab': 'tab',
        'esc': 'escape',
        'delete': 'backspace',
        'space': 'space',
        'up': 'up',
        'down': 'down',
        'left': 'left',
        'right': 'right',
        'home': 'home',
        'end': 'end',
        'pageup': 'pageup',
        'pagedown': 'pagedown'
      };

      const robotKey = keyMap[action] || action;
      robot.keyTap(robotKey);

      console.log(`⌨️  Special key: ${action}`);
    } catch (err) {
      console.error('Special key error:', err.message);
    }
  }

  // 言語切替
  switchLanguage(lang) {
    try {
      // macOSの入力ソース切替ショートカット（通常は Ctrl + Space または Cmd + Space）
      robot.keyTap('space', ['control']);

      this.currentLang = lang;
      console.log(`🌐 Switched to: ${lang}`);
    } catch (err) {
      console.error('Switch language error:', err.message);
    }
  }

  // ショートカット実行
  shortcut(shortcutStr) {
    try {
      // "cmd+c" のような文字列をパース
      const parts = shortcutStr.toLowerCase().split('+');
      const key = parts.pop();
      const modifiers = parts.map(m => this.convertModifier(m));

      robot.keyTap(key, modifiers);

      console.log(`⌨️  Shortcut: ${shortcutStr}`);
    } catch (err) {
      console.error('Shortcut error:', err.message);
    }
  }

  // 修飾キー変換
  convertModifiers(modifiers) {
    return modifiers.map(m => this.convertModifier(m));
  }

  convertModifier(modifier) {
    const map = {
      'command': 'command',
      'cmd': 'command',
      'option': 'alt',
      'opt': 'alt',
      'control': 'control',
      'ctrl': 'control',
      'shift': 'shift'
    };

    return map[modifier.toLowerCase()] || modifier;
  }

  // よく使うショートカット
  commonShortcuts = {
    copy: () => robot.keyTap('c', ['command']),
    paste: () => robot.keyTap('v', ['command']),
    cut: () => robot.keyTap('x', ['command']),
    undo: () => robot.keyTap('z', ['command']),
    redo: () => robot.keyTap('z', ['command', 'shift']),
    selectAll: () => robot.keyTap('a', ['command']),
    save: () => robot.keyTap('s', ['command']),
    find: () => robot.keyTap('f', ['command']),
    newTab: () => robot.keyTap('t', ['command']),
    closeTab: () => robot.keyTap('w', ['command']),
    quit: () => robot.keyTap('q', ['command']),
    screenshot: () => robot.keyTap('4', ['command', 'shift']),
    spotlight: () => robot.keyTap('space', ['command'])
  };

  // 共通ショートカット実行
  executeCommonShortcut(name) {
    const shortcut = this.commonShortcuts[name];
    if (shortcut) {
      shortcut();
      console.log(`⌨️  Common shortcut: ${name}`);
    } else {
      console.warn(`Unknown shortcut: ${name}`);
    }
  }
}

module.exports = KeyboardHandler;
