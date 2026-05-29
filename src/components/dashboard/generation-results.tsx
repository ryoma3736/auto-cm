import { CheckCircle2, Play } from "lucide-react";
import { ALL_ENGINE_IDS } from "@/lib/engines/catalog";
import { ENGINE_ACCENT, ENGINE_THUMB, ENGINE_SHORT } from "./engine-accent";

export function GenerationResults() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 card-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-base font-bold">生成結果（5エンジン同時完了）</h2>
        <button className="text-xs font-semibold text-brand-purple hover:underline">すべて見る →</button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ALL_ENGINE_IDS.map((id) => (
          <div key={id} className="overflow-hidden rounded-xl border border-border">
            <div className={`bg-gradient-to-r ${ENGINE_ACCENT[id]} px-2.5 py-1.5`}>
              <span className="text-xs font-bold text-white">{ENGINE_SHORT[id]}</span>
            </div>
            <div className={`relative grid aspect-[3/4] place-items-center bg-gradient-to-br ${ENGINE_THUMB[id]}`}>
              <span className="grid size-10 place-items-center rounded-full bg-white/85 text-foreground shadow">
                <Play className="size-4 translate-x-px fill-current" />
              </span>
              <span className="absolute bottom-1.5 left-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums">
                00:30
              </span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="size-3.5" /> Succeed
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
