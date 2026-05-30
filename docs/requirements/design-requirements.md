# デザイン要件 (Phase 1) — 改訂 2026-05-30

> **改訂**: 当初の cinematic-premium / dark-first / amber単色 / Sora+Geist 路線は、
> オーナーの明示的な好み「こんなワクワクするデザインがいいのよ」に基づき
> **playful-premium（作り込まれたワクワク）** へ転換。経緯は
> `.ai/decisions/2026-05-30-wakuwaku-redesign.md` を参照。

## 美的方向性
- **トーン**: playful-premium（ワクワクする映像スタジオ）。明るく・楽しく・親しみやすい。
- **ムード**: fun / friendly / energetic / confident。
- **差別化**: 意図あるブランド多色 ＋ 3Dマスコットの相棒。
  ただし汎用テンプレの **AI slop（青→紫→ピンクのグラデ・過剰グロー・予測可能テンプレ）は排除**。

## ブランドガイドライン（遵守）
- **カラー**: Customer Cloud 公式ドメインカラー由来の多色パレット（**light-first / bright**）。
  | 役割 | 色 | 出典 |
  |---|---|---|
  | primary / energy | Coral Orange `#E8734A` | Urban |
  | CTA | Amber → Coral グラデ（朝焼け/スポットライト） | — |
  | accent A | Sky Blue `#0095C8` | AGI |
  | accent B | Emerald `#079173` | Environment |
  | accent C | Royal Blue `#2856A3` | Finance |
  | canvas / ink | 暖かいオフホワイト / 暖かいチャコール | — |
- **禁止**: 汎用 青→紫→ピンク グラデ（AI slop）/ purple primary / Inter・Roboto・Arial /
  過剰ドロップシャドウ・グロー。
- グロー: 主CTAに暖色1点のみ。
- **タイポ**: 見出し・本文ともに **M PLUS Rounded 1c**（ワクワク＆日本語適性◎）。
  数値は tabular-nums、見出しは text-balance。

## UIコンポーネント方針
- shadcn/ui（base-nova）+ Tailwind v4 + motion/react + lucide-react。
- アニメーションは compositor props（transform/opacity）、~180–200ms。
- **情報設計**: 制作フロー（アップロード→台本→生成→比較）をホームの主役にする。
  偽のダッシュボード数値・ハードコードのサンプルデータを置かない（実データ＋空状態のみ）。

## レスポンシブ
- mobile-first。sm/md/lg ブレークポイント。タッチターゲット 44px+。

## 品質基準
- Lighthouse Performance 90+ / Accessibility 100、WCAG AA。
- light-first を既定とし、ダークモードは任意トグルで提供。
