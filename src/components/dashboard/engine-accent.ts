import type { EngineId } from "@/lib/engines/types";

/**
 * Per-engine accent gradients — intentional color-coding sourced from the
 * Customer Cloud domain palette (sky / emerald / amber-coral / royal blue).
 * No generic purple-pink "AI slop" gradients.
 */
export const ENGINE_ACCENT: Record<EngineId, string> = {
  sora2: "from-sky-400 to-sky-600", // Sky Blue (AGI) — premium / photoreal
  veo3: "from-emerald-400 to-emerald-600", // Emerald (Environment) — native audio
  kling: "from-amber-400 to-orange-500", // Amber-Coral — motion / energy
  seedance: "from-blue-500 to-indigo-700", // Royal Blue (Finance) — cinematic depth
  heygen: "from-orange-400 to-rose-500", // warm coral-rose — talking head
};

/** Short label shown on pills/cards (e.g. "Sora2", "Veo3"). */
export const ENGINE_SHORT: Record<EngineId, string> = {
  sora2: "Sora2",
  veo3: "Veo3",
  kling: "Kling",
  seedance: "Seedance",
  heygen: "HeyGen",
};
