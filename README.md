# AutoCM Studio 🎬

**商品画像1枚から、プロ品質のCM動画を自動生成。** Next.js + Vercel で動く AI 広告動画生成スタジオ。

アップロード → AIが商品を解析し台本を生成 → エンジンを選んで生成・比較・ダウンロード。

## エンジン
| Engine | Provider | 特徴 |
|--------|----------|------|
| Sora 2 | OpenAI (Replicate) | 最高品質・フォトリアル |
| Veo 3 | Google (Gemini API) | 音声同時生成 |
| Kling v2.5 | Kuaishou (Replicate) | モーション特化 |
| Seedance 1.0 | ByteDance (ModelArk) | シネマティック・低コスト |
| HeyGen | HeyGen | リップシンク（人物） |

## 技術スタック
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui · motion/react
· Vercel KV (ジョブ状態) · Vercel Blob (メディア)

## アーキテクチャ
動画生成は 30–300 秒かかるため、**非同期ジョブモデル**で Vercel のタイムアウトを回避:
`POST /api/generate` が各プロバイダの非同期APIをキックして即返却 → クライアントが
`GET /api/jobs/[id]` をポーリング（Replicate は webhook 併用）→ 完了動画を Blob に永続化。
詳細は [`docs/design/spec.md`](docs/design/spec.md)。

## ローカル開発
```bash
pnpm install
cp .env.example .env.local   # キーを設定（未設定ならデモモードで動作）
pnpm dev                     # http://localhost:3000
# デモモード（サンプル動画で全フロー体験）:
MOCK_ENGINES=1 pnpm dev
```

## デプロイ (Vercel)
```bash
vercel link
vercel deploy --prod
```
本番では Project Settings → Environment Variables にキーを設定。最低限 `GEMINI_API_KEY` と
`REPLICATE_API_TOKEN`。永続ジョブ/メディアには Vercel KV (Upstash) と Vercel Blob を有効化。

## ディレクトリ
```
src/
  app/            ルート + API (analyze / generate / jobs / webhooks)
  components/     studio/* (UI) + ui/* (shadcn)
  lib/
    engines/      統一エンジン契約 + 各プロバイダアダプタ
    pipeline/     Gemini 解析 + 台本生成
    jobs/         KV ジョブストア
_legacy/          旧 Express + 静的HTML 実装（移植参照用）
```

---
旧 Miyabi テンプレ実装からの再構築 (v1.0.0)。CCAGI SDK 管理。
