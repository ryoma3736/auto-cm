import { ALL_ENGINE_IDS } from "@/lib/engines/catalog";
import { ENGINE_ACCENT, ENGINE_SHORT } from "./engine-accent";

/** Dark translucent engine bar that overlays the hero bottom (matches reference). */
export function EnginePills() {
  return (
    <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-2xl border border-white/15 bg-black/25 px-5 py-3 backdrop-blur">
      {ALL_ENGINE_IDS.map((id) => (
        <div key={id} className="inline-flex items-center gap-2 text-sm font-bold text-white">
          <span
            className={`grid size-7 place-items-center rounded-full bg-gradient-to-br ${ENGINE_ACCENT[id]} text-xs text-white shadow`}
          >
            {ENGINE_SHORT[id].charAt(0)}
          </span>
          {ENGINE_SHORT[id]}
        </div>
      ))}
    </div>
  );
}
