import { sora2Engine, klingEngine } from "./replicate";
import { seedanceEngine } from "./seedance";
import { veo3Engine } from "./veo3";
import { heygenEngine } from "./heygen";
import { makeMockEngine } from "./mock";
import type { EngineId, VideoEngine } from "./types";

const REAL: Record<EngineId, VideoEngine> = {
  sora2: sora2Engine,
  kling: klingEngine,
  seedance: seedanceEngine,
  veo3: veo3Engine,
  heygen: heygenEngine,
};

/** Global mock switch — set MOCK_ENGINES=1 to force the sample-video mock for every engine. */
export function mockMode(): boolean {
  return process.env.MOCK_ENGINES === "1";
}

/** Resolve the engine implementation, transparently falling back to the mock when unconfigured. */
export function getEngine(id: EngineId): VideoEngine {
  if (mockMode()) return makeMockEngine(id);
  const engine = REAL[id];
  return engine.isConfigured() ? engine : makeMockEngine(id);
}

export function isEngineLive(id: EngineId): boolean {
  return !mockMode() && REAL[id].isConfigured();
}

export * from "./types";
export { ENGINE_CATALOG, ALL_ENGINE_IDS, getRecommendedEngine } from "./catalog";
export type { EngineInfo } from "./catalog";
