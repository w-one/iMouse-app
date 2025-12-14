/* ========================================
   iMouse 2.0 - アプリランチャー
   ======================================== */

class AppLauncher {
  constructor() {
    this.apps = [];
    this.recentApps = [];
    this.maxRecentApps = 5;
    this.modal = null;
    this.editor = null;
    this.editingApps = [];
  }

  init() {
    this.loadApps();
    this.renderApps();
    this.setupEventListeners();
  }

  // アプリ一覧を読み込み
  loadApps() {
    const stored = settingsManager.get('apps') || [];
    this.apps = stored.map(app => this.normalizeApp(app));
    // 古い形式の場合は保存し直す
    if (stored.length !== this.apps.length || stored.some((app, i) => app.type !== this.apps[i].type)) {
      settingsManager.set('apps', this.apps);
    }
    this.recentApps = JSON.parse(localStorage.getItem('recentApps') || '[]');
  }

  normalizeApp(app = {}) {
    return {
      name: app.name || 'New App',
      icon: app.icon || '⭐️',
      iconImage: app.iconImage || '',
      type: app.type || (app.url ? 'url' : 'app'),
      url: app.url || ''
    };
  }

  // アプリ一覧を表示
  renderApps() {
    const grid = document.getElementById('appGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!this.apps.length) {
      grid.innerHTML = `<div class="empty-state">Add apps from Customize to get started.</div>`;
      return;
    }

    this.apps.forEach(app => {
      const btn = document.createElement('button');
      btn.className = 'app-btn';
      const hasImage = !!app.iconImage;
      btn.innerHTML = `
        <span class="app-icon ${hasImage ? 'has-image' : ''}">
          ${hasImage ? `<img src="${app.iconImage}" alt="${app.name}">` : (app.icon || '⭐️')}
        </span>
        <span class="app-name">${app.name}</span>
      `;
      btn.addEventListener('click', () => this.launchApp(app));
      grid.appendChild(btn);
    });

    this.renderRecentApps();
  }

  // 最近使用したアプリを表示
  renderRecentApps() {
    const list = document.getElementById('recentAppList');
    if (!list) return;

    list.innerHTML = '';

    if (this.recentApps.length === 0) {
      return;
    }

    this.recentApps.forEach(app => {
      const item = document.createElement('div');
      item.className = 'recent-app-item';
      const hasImage = !!app.iconImage;
      item.innerHTML = `
        <span class="recent-app-icon ${hasImage ? 'has-image' : ''}">
          ${hasImage ? `<img src="${app.iconImage}" alt="${app.name}">` : (app.icon || '⭐️')}
        </span>
        <span class="recent-app-name">${app.name}</span>
        <span class="recent-app-time">${this.getTimeAgo(app.lastUsed)}</span>
      `;
      item.addEventListener('click', () => this.launchApp(app));
      list.appendChild(item);
    });
  }

  // アプリを起動
  launchApp(app) {
    console.log('Launching app:', app.name);
    settingsManager.haptic('medium');

    wsHandler.send({
      type: 'launchApp',
      appName: app.name,
      url: app.url || null,
      appType: app.type || 'app'
    });

    // 最近使用したアプリに追加
    this.addToRecent(app);

    // フィードバック
    this.showLaunchFeedback(app);
  }

  // 最近使用したアプリに追加
  addToRecent(app) {
    // 既存のエントリを削除
    this.recentApps = this.recentApps.filter(a => a.name !== app.name);

    // 先頭に追加
    this.recentApps.unshift({
      ...app,
      lastUsed: Date.now()
    });

    // 最大数を超えたら削除
    if (this.recentApps.length > this.maxRecentApps) {
      this.recentApps = this.recentApps.slice(0, this.maxRecentApps);
    }

    // 保存
    localStorage.setItem('recentApps', JSON.stringify(this.recentApps));

    // 再描画
    this.renderRecentApps();
  }

  // 起動フィードバック
  showLaunchFeedback(app) {
    const feedback = document.createElement('div');
    feedback.className = 'launch-feedback';
    feedback.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      padding: 30px;
      border-radius: 20px;
      z-index: 9999;
      text-align: center;
      animation: fadeInOut 1s ease-out;
    `;
    const iconMarkup = app.iconImage
      ? `<img src="${app.iconImage}" alt="${app.name}" style="width:64px;height:64px;border-radius:16px;object-fit:cover;margin-bottom:12px;">`
      : `<div style="font-size: 48px; margin-bottom: 10px;">${app.icon || '⭐️'}</div>`;

    feedback.innerHTML = `
      ${iconMarkup}
      <div style="font-size: 18px; font-weight: 600;">Launching ${app.name}...</div>
    `;
    document.body.appendChild(feedback);

    setTimeout(() => {
      feedback.remove();
    }, 1000);
  }

  // 検索機能
  searchApps(query) {
    const grid = document.getElementById('appGrid');
    if (!grid) return;

    const buttons = grid.querySelectorAll('.app-btn');
    buttons.forEach(btn => {
      const name = btn.querySelector('.app-name')?.textContent.toLowerCase();
      if (name && name.includes(query.toLowerCase())) {
        btn.style.display = '';
      } else {
        btn.style.display = 'none';
      }
    });
  }

  // 経過時間を取得
  getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  // イベントリスナー設定
  setupEventListeners() {
    const searchInput = document.getElementById('appSearch');
    searchInput?.addEventListener('input', (e) => {
      this.searchApps(e.target.value);
    });

    const customizeBtn = document.getElementById('customizeApps');
    customizeBtn?.addEventListener('click', () => this.openCustomize());

    this.modal = document.getElementById('appCustomizeModal');
    this.editor = document.getElementById('appListEditor');

    document.getElementById('closeCustomizeModal')?.addEventListener('click', () => this.closeCustomize());
    document.getElementById('addAppBtn')?.addEventListener('click', () => this.addEditingApp());
    document.getElementById('saveAppsBtn')?.addEventListener('click', () => this.saveApps());

    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeCustomize();
      }
    });
  }

  openCustomize() {
    if (!this.modal) return;
    this.editingApps = this.apps.map(app => ({ ...app }));
    if (!this.editingApps.length) {
      this.addEditingApp();
    } else {
      this.renderEditor();
    }
    this.modal.classList.add('active');
  }

  closeCustomize() {
    this.modal?.classList.remove('active');
  }

  addEditingApp() {
    this.editingApps.push(this.normalizeApp());
    this.renderEditor();
  }

  updateEditingApp(index, key, value) {
    if (this.editingApps[index]) {
      this.editingApps[index][key] = value;
    }
  }

  renderEditor() {
    if (!this.editor) return;
    this.editor.innerHTML = '';

    this.editingApps.forEach((app, index) => {
      const item = document.createElement('div');
      item.className = 'app-item';
      item.innerHTML = `
        <div class="app-icon-preview">
          ${app.iconImage ? `<img src="${app.iconImage}" alt="icon">` : (app.icon || '⭐️')}
        </div>
        <input type="text" class="app-name-input" data-index="${index}" value="${app.name}" placeholder="App name">
        <div class="icon-actions">
          <input type="text" class="icon-input" data-index="${index}" value="${app.icon}" placeholder="Emoji">
          <label class="icon-upload-btn">Image
            <input type="file" class="icon-file" accept="image/*" data-index="${index}" style="display:none;">
          </label>
          ${app.iconImage ? `<button class="remove-icon-btn" data-index="${index}">Clear</button>` : ''}
        </div>
        <select class="app-type" data-index="${index}">
          <option value="app" ${app.type === 'app' ? 'selected' : ''}>Mac App</option>
          <option value="url" ${app.type === 'url' ? 'selected' : ''}>Website</option>
        </select>
        <input type="text" class="app-url-input ${app.type === 'url' ? '' : 'hidden'}" data-index="${index}" value="${app.url || ''}" placeholder="https://example.com">
        <button class="remove-btn" data-index="${index}">✕</button>
      `;
      this.editor.appendChild(item);
    });

    this.bindEditorEvents();
  }

  bindEditorEvents() {
    this.editor.querySelectorAll('.app-name-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.updateEditingApp(idx, 'name', e.target.value);
      });
    });

    this.editor.querySelectorAll('.icon-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.updateEditingApp(idx, 'icon', e.target.value);
        this.updateEditingApp(idx, 'iconImage', '');
        const preview = e.target.closest('.app-item')?.querySelector('.app-icon-preview');
        if (preview) {
          preview.textContent = e.target.value || '⭐️';
        }
        const removeBtn = e.target.closest('.app-item')?.querySelector('.remove-icon-btn');
        removeBtn?.remove();
      });
    });

    this.editor.querySelectorAll('.icon-file').forEach(input => {
      input.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        const idx = parseInt(e.target.dataset.index, 10);
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          this.updateEditingApp(idx, 'iconImage', event.target.result);
          this.updateEditingApp(idx, 'icon', '');
          this.renderEditor();
        };
        reader.readAsDataURL(file);
      });
    });

    this.editor.querySelectorAll('.remove-icon-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.updateEditingApp(idx, 'iconImage', '');
        const preview = e.target.closest('.app-item')?.querySelector('.app-icon-preview');
        if (preview) {
          preview.textContent = this.editingApps[idx]?.icon || '⭐️';
        }
        e.target.remove();
      });
    });

    this.editor.querySelectorAll('.app-type').forEach(select => {
      select.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.updateEditingApp(idx, 'type', e.target.value);
        const urlInput = e.target.closest('.app-item')?.querySelector('.app-url-input');
        if (urlInput) {
          urlInput.classList.toggle('hidden', e.target.value !== 'url');
        }
      });
    });

    this.editor.querySelectorAll('.app-url-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.updateEditingApp(idx, 'url', e.target.value);
      });
    });

    this.editor.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        this.editingApps.splice(idx, 1);
        this.renderEditor();
      });
    });
  }

  saveApps() {
    this.apps = this.editingApps
      .map(app => this.normalizeApp(app))
      .filter(app => app.name.trim().length);
    settingsManager.set('apps', this.apps);
    this.renderApps();
    this.editingApps = [];
    this.closeCustomize();
  }
}

// グローバルインスタンス
const appLauncher = new AppLauncher();

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  appLauncher.init();
});
