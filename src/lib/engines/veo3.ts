import { env } from "@/lib/env";
import type { EngineStatus, EngineSubmission, GenerateParams, VideoEngine } from "./types";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "veo-3.0-fast-generate-001";

/** Google Veo 3 via Gemini API long-running operations (poll-based, native audio). */
export const veo3Engine: VideoEngine = {
  id: "veo3",
  isConfigured: () => Boolean(env.GEMINI_API_KEY),

  async submit(params: GenerateParams): Promise<EngineSubmission> {
    const instance: Record<string, unknown> = { prompt: params.prompt };
    if (params.imageBase64) {
      instance.image = {
        bytesBase64Encoded: params.imageBase64.replace(/^data:[^;]+;base64,/, ""),
        mimeType: "image/jpeg",
      };
    }
    const res = await fetch(`${BASE_URL}/models/${MODEL}:predictLongRunning?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [instance],
        parameters: { aspectRatio: params.aspectRatio, generateAudio: true },
      }),
    });
    if (!res.ok) throw new Error(`Veo3 submit failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { name?: string };
    if (!data.name) throw new Error("Veo3: missing operation name");
    return { providerId: data.name, pollMode: "poll" };
  },

  async poll(providerId: string): Promise<EngineStatus> {
    const res = await fetch(`${BASE_URL}/${providerId}?key=${env.GEMINI_API_KEY}`);
    if (!res.ok) return { status: "failed", error: `Veo3 poll ${res.status}` };
    const data = (await res.json()) as {
      done?: boolean;
      error?: { message?: string };
      response?: {
        generateVideoResponse?: { generatedSamples?: Array<{ video?: { uri?: string } }> };
      };
    };
    if (!data.done) return { status: "processing" };
    if (data.error) return { status: "failed", error: data.error.message ?? "Veo3 failed" };
    const uri = data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
    // Veo download URIs require the API key appended.
    const videoUrl = uri ? `${uri}${uri.includes("?") ? "&" : "?"}key=${env.GEMINI_API_KEY}` : undefined;
    return videoUrl ? { status: "succeeded", videoUrl } : { status: "failed", error: "Veo3: no video uri" };
  },
};
