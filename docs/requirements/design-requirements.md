# デザイン要件 (Phase 1)

## 美的方向性
- **トーン**: cinematic-premium（映画スタジオの暗室）。
- **ムード**: confident / warm / filmic。
- **差別化**: 温かいアンバーの光。AI slop（紫グラデ・過剰グロー・予測可能テンプレ）を排除。

## ブランドガイドライン（遵守）
- カラー: amber アクセント（oklch ~0.8 0.16 68）+ ニュートラル、dark-first。
- **禁止**: 紫グラデ on 白背景 / Inter・Roboto・Arial / 過剰ドロップシャドウ・グロー。
- タイポ: 見出し **Sora**、本文 **Geist**。text-balance / tabular-nums。

## UIコンポーネント方針
- shadcn/ui（base-nova）+ Tailwind v4 + motion/react + lucide-react。
- アニメーションは compositor props（transform/opacity）、~180–200ms。

## レスポンシブ
- mobile-first。sm/md/lg ブレークポイント。タッチターゲット 44px+。

## 品質基準
- Lighthouse Performance 90+ / Accessibility 100、WCAG AA、ダークモード対応。
