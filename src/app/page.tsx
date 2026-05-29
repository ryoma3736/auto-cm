import { Clapperboard, ExternalLink, Sparkles } from "lucide-react";
import { Studio } from "@/components/studio/studio";
import { ALL_ENGINE_IDS, isEngineLive, mockMode } from "@/lib/engines";
import type { EngineId } from "@/lib/engines/types";

export default function Home() {
  const liveEngines: EngineId[] = ALL_ENGINE_IDS.filter((id) => isEngineLive(id));
  const demo = mockMode() || liveEngines.length === 0;

  return (
    <main className="relative flex-1">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-brand text-brand-foreground">
              <Clapperboard className="size-4" />
            </span>
            <span className="font-heading text-lg font-bold">AutoCM Studio</span>
          </div>
          <a
            href="https://github.com/ryoma3736/auto-cm"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            aria-label="GitHub リポジトリ"
          >
            GitHub <ExternalLink className="size-4" />
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 grain opacity-60" aria-hidden />
        <div className="mx-auto max-w-5xl px-4 pb-10 pt-16 text-center sm:pt-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-brand" />
            5つの生成エンジンを切り替え・比較
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance font-heading text-4xl font-bold leading-tight sm:text-6xl">
            商品画像1枚から、
            <span className="text-gradient-brand">プロ品質のCM動画</span>を。
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground sm:text-lg">
            アップロード → AIが商品を解析し台本を生成 → エンジンを選んで生成。
            Sora 2・Veo 3・Kling・Seedance・HeyGen に対応。
          </p>
          {demo && (
            <p className="mt-4 text-xs text-muted-foreground">
              現在<strong className="text-brand">デモモード</strong>で動作中（APIキー未設定）。サンプル動画で全フローを体験できます。
            </p>
          )}
        </div>
      </section>

      {/* Studio */}
      <section className="mx-auto max-w-5xl px-4 pb-24">
        <Studio liveEngines={liveEngines} />
      </section>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        AutoCM Studio · Powered by Next.js + Vercel
      </footer>
    </main>
  );
}
