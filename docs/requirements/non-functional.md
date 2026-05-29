# 非機能要件 (Phase 1)

## パフォーマンス
- Lighthouse Performance 90+ / Accessibility 100 を目標。
- 動画生成は非同期。APIレスポンスは即時（送信受付）、進捗はポーリングで取得。
- Vercel serverless のタイムアウト回避: 各 Route Handler は短時間で応答（プロバイダの
  非同期API + webhook/poll）。`maxDuration` は 60s。

## 信頼性
- ジョブ状態は Vercel KV (Upstash Redis) に永続化（TTL 1日）。
- 1エンジンが失敗しても他エンジンの結果は影響を受けない（per-engine 独立）。
- プロバイダ未設定時は自動でモックにフォールバック（クラッシュさせない）。

## セキュリティ
- APIキーはサーバ環境変数のみ（クライアントへ露出しない）。
- ユーザー入力（プロンプト・画像）を shell/Actions に展開しない（#90再発防止）。
- 生成動画は Vercel Blob 経由で自ドメイン配信。

## アクセシビリティ / ブランド
- WCAG 2.1 AA（コントラスト 4.5:1+、44pxタッチターゲット、aria-label）。
- ブランド準拠: 紫グラデ on 白背景の禁止、Inter/Roboto/Arial 禁止。
  → 見出し Sora / 本文 Geist、シネマティックな amber アクセント、dark-first。
- アニメーションは compositor props（transform/opacity）中心、200ms前後。

## デプロイ
- Vercel（GitHub連携 + CLI）。preview→production。
- 環境変数: GEMINI_API_KEY, REPLICATE_API_TOKEN（必須）/ ARK_*, HEYGEN_API_KEY,
  ELEVENLABS_API_KEY, OPENAI_API_KEY, BLOB_READ_WRITE_TOKEN, KV_REST_API_*。
