/* ========================================
   iMouse 2.0 - アプリランチャーハンドラー
   ======================================== */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class LauncherHandler {
  constructor(config) {
    this.config = config;
    this.appCache = new Map();
    console.log('✅ Launcher handler initialized');
  }

  // アプリを起動
  launch(payload) {
    const appName = typeof payload === 'string' ? payload : payload?.appName || payload?.name;
    const url = payload?.url;
    const appType = payload?.appType || payload?.type || (url ? 'url' : 'app');

    if (url) {
      this.launchUrl(url);
      return;
    }

    if (!appName) {
      console.warn('No app name specified for launch request');
      return;
    }

    console.log(`🚀 Launching: ${appName}`);

    try {
      const cmd = appType === 'app'
        ? `open -a "${appName}"`
        : `open "${appName}"`;

      exec(cmd, (error) => {
        if (error) {
          console.error(`❌ Failed to launch ${appName}:`, error.message);
          if (appType === 'app') {
            this.launchViaSpotlight(appName);
          }
          return;
        }

        console.log(`✅ Launched: ${appName}`);
      });

    } catch (err) {
      console.error('Launch error:', err.message);
    }
  }

  launchUrl(url) {
    try {
      exec(`open "${url}"`, (error) => {
        if (error) {
          console.error(`❌ Failed to open URL ${url}:`, error.message);
        } else {
          console.log(`✅ Opened URL: ${url}`);
        }
      });
    } catch (err) {
      console.error('URL launch error:', err.message);
    }
  }

  // Spotlight経由で起動
  launchViaSpotlight(appName) {
    const cmd = `osascript -e 'tell application "System Events" to keystroke space using command down' && sleep 0.5 && osascript -e 'tell application "System Events" to keystroke "${appName}"' && sleep 0.5 && osascript -e 'tell application "System Events" to key code 36'`;

    exec(cmd, (error) => {
      if (error) {
        console.error(`❌ Spotlight launch failed:`, error.message);
      }
    });
  }

  // インストール済みアプリ一覧を取得
  getAppList() {
    const appDirs = [
      '/Applications',
      path.join(process.env.HOME, 'Applications')
    ];

    const apps = [];

    appDirs.forEach(dir => {
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            if (file.endsWith('.app')) {
              const appName = file.replace('.app', '');
              apps.push({
                name: appName,
                path: path.join(dir, file),
                icon: this.getAppIcon(appName)
              });
            }
          });
        }
      } catch (err) {
        console.error(`Error reading ${dir}:`, err.message);
      }
    });

    return apps;
  }

  // アプリのアイコンを取得（簡易版）
  getAppIcon(appName) {
    // 一般的なアプリのアイコンマッピング
    const iconMap = {
      'Mail': '📧',
      'Safari': '🌐',
      'Messages': '💬',
      'Finder': '📁',
      'Calendar': '📅',
      'Photos': '📷',
      'Music': '🎵',
      'Podcasts': '🎙️',
      'TV': '📺',
      'Books': '📚',
      'App Store': '🛍️',
      'System Settings': '⚙️',
      'Notes': '📝',
      'Reminders': '✅',
      'Contacts': '👤',
      'FaceTime': '📞',
      'Maps': '🗺️',
      'Weather': '🌤️',
      'Stocks': '📈',
      'Home': '🏠',
      'Voice Memos': '🎤',
      'Calculator': '🧮',
      'Clock': '⏰',
      'Preview': '🔍',
      'TextEdit': '📄',
      'Terminal': '⌨️',
      'Activity Monitor': '📊',
      'Disk Utility': '💿',
      'Font Book': '🔤',
      'Xcode': '🔨',
      'Visual Studio Code': '💻',
      'Slack': '💬',
      'Discord': '🎮',
      'Spotify': '🎵',
      'Chrome': '🌐',
      'Firefox': '🦊',
      'Notion': '📝',
      'Notion Calendar': '📅',
      'Canva': '🎨',
      'Figma': '🧩',
      'ChatGPT': '🤖',
      'Arc': '🌀',
      'Obsidian': '💎'
    };

    return iconMap[appName] || '📦';
  }

  // アプリが実行中か確認
  isAppRunning(appName) {
    return new Promise((resolve) => {
      const cmd = `osascript -e 'tell application "System Events" to (name of processes) contains "${appName}"'`;

      exec(cmd, (error, stdout) => {
        if (error) {
          resolve(false);
          return;
        }
        resolve(stdout.trim() === 'true');
      });
    });
  }

  // アプリを終了
  quitApp(appName) {
    const cmd = `osascript -e 'tell application "${appName}" to quit'`;

    exec(cmd, (error) => {
      if (error) {
        console.error(`Failed to quit ${appName}:`, error.message);
      } else {
        console.log(`Quit: ${appName}`);
      }
    });
  }
}

module.exports = LauncherHandler;
