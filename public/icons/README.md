# PWA Icons

このディレクトリにはPWAアプリアイコンを配置します。

## 必要なアイコン

以下のサイズのアイコンを作成してください:

- `icon-192.png` - 192x192px
- `icon-512.png` - 512x512px

## アイコンの作成方法

### オンラインツールを使用（簡単）

1. [Favicon Generator](https://realfavicongenerator.net/) にアクセス
2. マスター画像（1024x1024px推奨）をアップロード
3. PWAアイコンを生成
4. ダウンロードしてこのディレクトリに配置

### 手動で作成

1. お好みの画像編集ソフト（Photoshop、Figma、Canvaなど）を使用
2. 以下の仕様で作成:
   - 背景色: 黒（#000000）
   - アイコン: 白または青
   - デザイン: シンプルなマウス/トラックパッドのイラスト
   - フォーマット: PNG
   - サイズ: 192x192px と 512x512px

### 推奨デザイン

```
┌─────────────────┐
│                 │
│    🖱️ iMouse    │
│                 │
│  ┌───────────┐  │
│  │           │  │
│  │     ○     │  │
│  │           │  │
│  └───────────┘  │
│                 │
└─────────────────┘
```

## プレースホルダー（開発用）

開発中は以下のコマンドで簡易アイコンを生成できます:

```bash
# ImageMagickを使用（インストールが必要）
convert -size 192x192 xc:#007AFF -gravity center -pointsize 80 -fill white -annotate +0+0 "iM" icon-192.png
convert -size 512x512 xc:#007AFF -gravity center -pointsize 200 -fill white -annotate +0+0 "iM" icon-512.png
```

または、オンラインで生成:
- https://www.favicon-generator.org/
- https://favicon.io/
