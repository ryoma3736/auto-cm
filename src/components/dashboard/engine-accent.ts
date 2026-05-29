import type { EngineId } from "@/lib/engines/types";

/** Per-engine accent gradients matched to the reference design. */
export const ENGINE_ACCENT: Record<EngineId, string> = {
  sora2: "from-blue-400 to-blue-600",
  veo3: "from-teal-400 to-emerald-600",
  kling: "from-orange-400 to-amber-600",
  seedance: "from-violet-400 to-purple-600",
  heygen: "from-pink-400 to-rose-600",
};

/** Softer thumbnail backgrounds per engine. */
export const ENGINE_THUMB: Record<EngineId, string> = {
  sora2: "from-amber-200 via-orange-200 to-rose-200",
  veo3: "from-indigo-300 via-blue-300 to-sky-200",
  kling: "from-orange-300 via-amber-200 to-yellow-200",
  seedance: "from-fuchsia-300 via-purple-300 to-indigo-300",
  heygen: "from-rose-200 via-pink-200 to-orange-200",
};

/** Short label shown on pills/cards (e.g. "Sora2", "Veo3"). */
export const ENGINE_SHORT: Record<EngineId, string> = {
  sora2: "Sora2",
  veo3: "Veo3",
  kling: "Kling",
  seedance: "Seedance",
  heygen: "HeyGen",
};
