# 🖱️ iMouse 2.0
**iPhone を Mac の Magic Trackpad に変える、ローカル常駐型リモートコントローラ**

iMouse 2.0 は、iPhone を **高精度な Mac 用トラックパッド / リモートコントロール** として使える PWA + ローカルサーバーアプリです。
Web 技術をベースにしつつ、`robotjs` による **ネイティブレベルの操作** を実現しています。

---

## ✨ 主な機能

### 🖱️ トラックパッド操作
* **1本指:** カーソル移動 / タップでクリック
* **2本指:** スクロール / タップで右クリック / ピンチでズーム
* **長押し:** ドラッグ & ドロップ
* **詳細設定:** カーソル速度・加速度・スクロール調整

### 📱 アプリランチャー
* Mac アプリ / Web をワンタップ起動
* 絵文字・画像アイコン対応
* 最近使用したアプリの自動表示
* Spotlight 検索対応

### ⌨️ リモートキーボード
* テキスト入力
* 修飾キー（⌘ / ⌥ / ⌃ / ⇧）
* 特殊キー（Enter / Tab / Esc / Delete）
* 日本語 / 英語切替
* バッファ入力 / リアルタイム入力

### 🎬 プレゼンテーションモード
* スライド送り / 戻し
* タイマー
* Black / White Screen
* 発表者ノート表示

---

## 🚀 セットアップ

### 必要要件
* **Mac:** macOS 10.14 以降
* **iPhone / iPad:** iOS 13 以降（Safari）
* **Node.js:** v16 以降
* **ネットワーク:** 同一 Wi-Fi ネットワーク

### 1️⃣ Mac サーバーのセットアップ
iMouse は **各自の Mac でローカルに動かす設計** です（`robotjs` による OS 操作のため、クラウド配信は不可）。

```bash
# 1. リポジトリをクローン
git clone [https://github.com/YOUR_USERNAME/iMouse-app.git](https://github.com/YOUR_USERNAME/iMouse-app.git)
cd iMouse-app/server

# 2. 依存関係をインストール
npm install

# 3. robotjs を Mac 用にビルド（重要）
npm rebuild robotjs --build-from-source