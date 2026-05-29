# AutoCM Studio — 設計仕様 (Phase 2)

## アーキテクチャ概要
```
Browser (Studio client component, step machine)
  │  upload image → /api/analyze
  │  generate     → /api/generate  ── submit() each engine (async)
  │  poll         → /api/jobs/[id] ── poll() providers, persist to Blob
  └  webhook (Replicate fast-path) → /api/webhooks/replicate

Server (lib/)
  engines/   : 統一エンジン契約 (submit/poll/parseWebhook)
               replicate(sora2,kling) / seedance / veo3 / heygen / mock
  pipeline/  : analyzeAndScript()  — Gemini Vision → 解析 + 台本
  jobs/      : KV(Upstash) ジョブストア（in-memory フォールバック）
  blob.ts    : Vercel Blob へ動画/画像永続化
```

## 非同期ジョブモデル（最重要）
動画生成は 30–300秒。単一リクエスト内で待たず、以下で Vercel タイムアウトを回避:
1. `POST /api/generate`: 各エンジンの非同期APIをキック → `providerId` を KV ジョブに記録 → 即返却。
2. クライアントは `GET /api/jobs/[id]` を4秒間隔ポーリング。各呼び出しはプロバイダ status を
   1回問い合わせるだけ（短時間応答）。
3. Replicate は webhook も併用（`?jobId&engine` をURLに埋め込み、reverse index 不要）。
4. 完了時、動画を Vercel Blob にコピーし自ドメインURLを返す。

## API
| Method | Path | 役割 |
|--------|------|------|
| POST | /api/analyze | 画像+設定 → {analysis, script} |
| POST | /api/generate | engines+prompt+image → {jobId, job} |
| GET  | /api/jobs/[id] | ジョブ状態を進めて返す |
| POST | /api/webhooks/replicate | Replicate完了の高速反映 |

## 主要型
- `VideoEngine`: `{ id, isConfigured, submit, poll, parseWebhook? }`
- `Job`: `{ id, status, engines[], runs: Record<engine, EngineRun>, prompt, timestamps }`
- `AdScript`: `{ hook, narration(lang保証), videoPrompt(英語/ナレーション内包), duration, lang }`

## UI フロー（3ステップ）
1. **アップロード**: Dropzone + 設定（言語/尺/比率/ヒント/演出）。
2. **台本 & エンジン**: 解析結果カード + 編集可能な台本 + エンジン選択カード（推奨バッジ/デモバッジ）。
3. **生成結果**: per-engine 動画プレイヤー + 進捗 + ダウンロード + 再生成。

## デザインシステム
`docs/design/design-system.yml` 参照。dark-first、amber アクセント、見出し Sora。
