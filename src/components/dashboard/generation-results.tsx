import { CheckCircle2, Play } from "lucide-react";
import { ALL_ENGINE_IDS } from "@/lib/engines/catalog";
import { ENGINE_ACCENT, ENGINE_SHORT } from "./engine-accent";
import type { EngineId } from "@/lib/engines/types";

const THUMB_SRC: Record<EngineId, string> = {
  sora2: "/thumbs/gen-1.jpg",
  veo3: "/thumbs/gen-2.jpg",
  kling: "/thumbs/gen-3.jpg",
  seedance: "/thumbs/gen-4.jpg",
  heygen: "/thumbs/gen-5.jpg",
};

export function GenerationResults() {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 card-soft">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-base font-bold">生成結果（5エンジン同時完了）</h2>
        <button className="text-xs font-semibold text-brand-purple hover:underline">すべて見る →</button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ALL_ENGINE_IDS.map((id) => (
          <div key={id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
            <div className={`bg-gradient-to-r ${ENGINE_ACCENT[id]} px-3 py-2`}>
              <span className="text-xs font-bold text-white drop-shadow-sm">{ENGINE_SHORT[id]}</span>
            </div>
            <div className="relative aspect-[3/4] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={THUMB_SRC[id]}
                alt={`${ENGINE_SHORT[id]} 生成結果サンプル`}
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
              <span className="absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-foreground shadow-lg backdrop-blur transition-transform group-hover:scale-110">
                <Play className="size-4 translate-x-px fill-current" />
              </span>
              <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                00:30
              </span>
            </div>
            <div className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="size-3.5" /> Succeed
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
