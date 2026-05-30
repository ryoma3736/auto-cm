# Decision: "ワクワク" 路線への転換と UI 全面リデザイン

- **日付**: 2026-05-30
- **状態**: 採用（オーナー明示承認済み）
- **対象**: AutoCM Studio（auto-cm）UI / デザイン要件

## Context
当初の `docs/requirements/design-requirements.md` は cinematic-premium / dark-first /
amber単色 / Sora+Geist を規定していた。一方、実装された UI は青→紫→ピンクのグラデ＋
過剰グロー＋丸ポップ体＋3Dマスコット＋偽ダッシュボード（総生成128・完了率98.5%・
PRO PLAN クレジット等のハードコード）という、書面要件の真逆だった。

辛口評価の過程で「紫グラデ＝悪 → 暗くしろ」と提案したが、オーナーは現状スクリーンショットを
添えて **「こんなワクワクするデザインがいいのよ」** と回答。真の狙いは "暗い高級感" ではなく
**"楽しさ・親しみ・高揚感（ワクワク）"** であることが判明した。

## Decision
1. **路線**: cinematic-premium（dark）→ **playful-premium（ワクワク, light/bright）** へ転換。
   マスコット・明るさ・楽しさは資産として維持。
2. **配色**: 汎用 青→紫→ピンク グラデ（AI slop）を廃止し、**Customer Cloud 公式ドメイン
   カラー由来の意図ある多色**（Coral/Amber/Sky/Emerald/Royal）へ置換。
   → ブランド規約「紫グラデは禁止」に**合致**する形で "ワクワク" を実現。
3. **情報設計**: 制作フローをホームの主役に。偽ダッシュボード（stat-cards / 偽 recent /
   PRO PLAN ウィジェット / 偽 generation-results）を削除。最近の作品は localStorage 実データ＋
   空状態のみ。モーダル封印を解除し Studio を常設。
4. **比較強化**: result ステップにエンジンスペックチップ（provider/品質/時間/コスト）と
   "ベスト選択" を追加（FR-6/7 の比較体験を看板化）。

## Rationale
- デザインの最終決定権はオーナーにある。書面要件は実態・意図に合わせて更新するのが正しい。
- "ワクワク" は紫グラデ固有ではない。意図あるブランド多色なら、楽しさ・品質・独自性・
  ブランド整合を同時に満たせる（メタ認知の核心）。

## Consequences / 既知のトレードオフ
- **タイポ規約からの逸脱（承認済み）**: 組織 `brand-guidelines.md` は見出し Rustica /
  本文 Source Han Sans を規定するが、本プロダクトは "ワクワク" 表現のため **M PLUS Rounded 1c**
  を採用。プロダクト固有の意図的逸脱としてここに記録。
- **スコープ外（今回見送り）**: result の **per-engine 再生成**。現行の単一ジョブ＋
  ポーリング・モデルと「lib/api を触らない」制約の下では、健全な実装に API/ジョブモデルの
  変更が必要なため見送り。将来 `GET /api/jobs` リスト化（KV `autocm:jobs:recent`）と併せて
  サーバ駆動の履歴・再生成として実装する。

## 検証
- `pnpm typecheck` 0エラー / `pnpm lint` 0エラー。
- brand grep ゲート（青→紫→ピンク・brand-purple・violet）0ヒット。
- デモフロー（MOCK_ENGINES=1）でアップロード→台本→生成→比較→DL→空状態を目視。
- Vercel 本番（auto-cm-flame.vercel.app）で稼働確認。
