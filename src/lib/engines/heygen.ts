import { env } from "@/lib/env";
import type { EngineStatus, EngineSubmission, GenerateParams, VideoEngine } from "./types";

const BASE_URL = "https://api.heygen.com";
const DEFAULT_VOICE_ID = "1bd001e7e50f421d891986aad5158bc8"; // Satoshi (ja) preset

/** HeyGen talking-photo lip-sync generation (poll-based). */
export const heygenEngine: VideoEngine = {
  id: "heygen",
  isConfigured: () => Boolean(env.HEYGEN_API_KEY),

  async submit(params: GenerateParams): Promise<EngineSubmission> {
    const body = {
      video_inputs: [
        {
          character: params.talentImageUrl
            ? { type: "talking_photo", talking_photo_url: params.talentImageUrl }
            : { type: "talking_photo", talking_photo_url: params.imageUrl },
          voice: {
            type: "text",
            input_text: params.narration ?? params.prompt,
            voice_id: params.voiceId ?? DEFAULT_VOICE_ID,
          },
        },
      ],
      dimension:
        params.aspectRatio === "16:9"
          ? { width: 1280, height: 720 }
          : { width: 720, height: 1280 },
    };
    const res = await fetch(`${BASE_URL}/v2/video/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": env.HEYGEN_API_KEY },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HeyGen submit failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { data?: { video_id?: string } };
    const id = data.data?.video_id;
    if (!id) throw new Error("HeyGen: missing video_id");
    return { providerId: id, pollMode: "poll" };
  },

  async poll(providerId: string): Promise<EngineStatus> {
    const res = await fetch(`${BASE_URL}/v1/video_status.get?video_id=${providerId}`, {
      headers: { "X-Api-Key": env.HEYGEN_API_KEY },
    });
    if (!res.ok) return { status: "failed", error: `HeyGen poll ${res.status}` };
    const data = (await res.json()) as {
      data?: { status?: string; video_url?: string; error?: { message?: string } };
    };
    const d = data.data;
    switch (d?.status) {
      case "completed":
        return { status: "succeeded", videoUrl: d.video_url };
      case "failed":
        return { status: "failed", error: d.error?.message ?? "HeyGen failed" };
      case "pending":
        return { status: "pending" };
      default:
        return { status: "processing" };
    }
  },
};
