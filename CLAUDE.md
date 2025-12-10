# auto-cm

商品画像から12秒CM動画を自動生成

## クイックスタート
```bash
cp .env.example .env  # APIキー設定
npm install && npm run build
npm run dev           # localhost:3000
```

## API

### V1: 基本機能
```
POST /api/v1/generate
Content-Type: application/json
{
  "imageBase64": "base64画像",
  "duration": 12,
  "language": "ja"
}
```

### V2: タレント起用機能
```
POST /api/v2/generate
Content-Type: application/json
{
  "imageBase64": "base64画像",
  "talentName": "新垣結衣",
  "duration": 12,
  "language": "ja"
}
```

## パイプライン (8段階)
1. 画像検証 → 2. Gemini分析 → 3. スクリプト生成 → 4. 縦長変換(9:16)
5. リサイズ(720x1280) → 6. Sora2動画生成 → 7. TTS音声合成 → 8. Drive保存

## V2: タレント起用機能

### 使用方法
```typescript
const result = await pipeline.generate({
  imageBase64: "...",
  talentName: "新垣結衣"  // タレント名を指定
});
```

### 対応タレント
任意の日本人タレント名を指定可能。AIが特徴を分析してCMに反映。

### 特徴
- タレントのイメージに合わせた台本生成
- 商品との相性を自動分析
- 自然な演出表現

## 構成
```
src/
├── pipeline/index.ts    # メインパイプライン
├── modules/
│   ├── image-analyzer/  # Gemini/GPT-4 Vision
│   ├── script-generator # CM台本生成
│   ├── video-generator  # Sora2 via Replicate
│   └── voice-generator  # TTS
└── server.ts            # Express API
```

## コマンド
```bash
npm test              # テスト
npm run typecheck     # 型チェック
npm run lint          # Lint
```

## 必須環境変数
- `GEMINI_API_KEY` - 画像分析
- `REPLICATE_API_TOKEN` - 動画生成
