"use client";

import { Hero } from "./hero";
import { Studio } from "@/components/studio/studio";
import type { EngineId } from "@/lib/engines/types";

/**
 * The creation flow is the primary surface — no modal. The hero CTA simply scrolls down
 * to the always-mounted Studio panel.
 */
export function StudioLauncher({
  liveEngines,
  demo,
}: {
  liveEngines: EngineId[];
  demo: boolean;
}) {
  const scrollToStudio = () => {
    document.getElementById("studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Hero onStart={scrollToStudio} />

      <section id="studio" className="scroll-mt-20">
        <div className="rounded-3xl border border-border bg-card p-5 card-soft sm:p-7">
          <div className="mb-6">
            <h2 className="font-heading text-2xl font-extrabold">
              <span className="text-gradient-primary">CMを作る</span> 🎬
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              商品画像をアップロード → AIが解析・台本生成 → エンジンを選んで生成・比較。
              {demo && "（現在デモモード：サンプル動画で全フローを体験できます）"}
            </p>
          </div>
          <Studio liveEngines={liveEngines} />
        </div>
      </section>
    </>
  );
}
