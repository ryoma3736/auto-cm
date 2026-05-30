import type { EngineId, EngineStatus, EngineSubmission, GenerateParams, VideoEngine } from "./types";

// Bundled local sample (same-origin) — the previous gtv-videos-bucket URL is now HTTP 403.
const SAMPLE_VIDEO = "/sample-cm.mp4";

/**
 * Deterministic mock engine used when MOCK_ENGINES=1 or no provider is configured.
 * Lets the full upload → analyze → generate → result flow be exercised (incl. E2E) without
 * spending money on real API calls.
 */
export function makeMockEngine(id: EngineId): VideoEngine {
  return {
    id,
    isConfigured: () => true,
    async submit(_params: GenerateParams): Promise<EngineSubmission> {
      return { providerId: `mock-${id}-${Date.now()}`, pollMode: "poll" };
    },
    async poll(): Promise<EngineStatus> {
      return { status: "succeeded", videoUrl: SAMPLE_VIDEO, progress: 100 };
    },
  };
}
