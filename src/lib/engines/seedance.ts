import { env } from "@/lib/env";
import type { EngineStatus, EngineSubmission, GenerateParams, VideoEngine } from "./types";

const BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3";

/** ByteDance Seedance 1.0 Pro via BytePlus ModelArk (poll-based). */
export const seedanceEngine: VideoEngine = {
  id: "seedance",
  isConfigured: () => Boolean(env.ARK_API_KEY && env.ARK_ENDPOINT_ID),

  async submit(params: GenerateParams): Promise<EngineSubmission> {
    const content: Array<Record<string, unknown>> = [
      { type: "text", text: `${params.prompt} --ratio ${params.aspectRatio} --dur ${params.duration}` },
    ];
    const image = params.imageUrl ?? params.imageBase64;
    if (image) content.push({ type: "image_url", image_url: { url: image } });

    const res = await fetch(`${BASE_URL}/contents/generations/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.ARK_API_KEY}`,
      },
      body: JSON.stringify({ model: env.ARK_ENDPOINT_ID, content }),
    });
    if (!res.ok) throw new Error(`Seedance submit failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { id?: string };
    if (!data.id) throw new Error("Seedance: missing task id");
    return { providerId: data.id, pollMode: "poll" };
  },

  async poll(providerId: string): Promise<EngineStatus> {
    const res = await fetch(`${BASE_URL}/contents/generations/tasks/${providerId}`, {
      headers: { Authorization: `Bearer ${env.ARK_API_KEY}` },
    });
    if (!res.ok) return { status: "failed", error: `Seedance poll ${res.status}` };
    const data = (await res.json()) as {
      status?: string;
      content?: { video_url?: string } | Array<{ type: string; video_url?: string }>;
      error?: { message?: string };
    };

    let videoUrl: string | undefined;
    const c = data.content;
    if (Array.isArray(c)) videoUrl = c.find((x) => x.type === "video_url")?.video_url;
    else if (c) videoUrl = c.video_url;

    switch (data.status) {
      case "succeeded":
        return { status: "succeeded", videoUrl };
      case "failed":
        return { status: "failed", error: data.error?.message ?? "Seedance failed" };
      case "queued":
        return { status: "pending" };
      default:
        return { status: "processing" };
    }
  },
};
