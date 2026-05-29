import Replicate from "replicate";
import { env } from "@/lib/env";
import type {
  AspectRatio,
  EngineId,
  EngineStatus,
  EngineSubmission,
  GenerateParams,
  VideoEngine,
} from "./types";

const client = () => new Replicate({ auth: env.REPLICATE_API_TOKEN });

function mapStatus(s: string): EngineStatus["status"] {
  if (s === "succeeded") return "succeeded";
  if (s === "failed" || s === "canceled") return "failed";
  if (s === "starting") return "pending";
  return "processing";
}

function firstUrl(output: unknown): string | undefined {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const last = output[output.length - 1];
    return typeof last === "string" ? last : undefined;
  }
  if (output && typeof output === "object" && "url" in output) {
    const u = (output as { url: unknown }).url;
    return typeof u === "string" ? u : undefined;
  }
  return undefined;
}

/** Build a Replicate-backed engine. Sora 2 and Kling share the predictions API but differ in model/input. */
function makeReplicateEngine(
  id: EngineId,
  model: `${string}/${string}`,
  buildInput: (p: GenerateParams) => Record<string, unknown>,
): VideoEngine {
  return {
    id,
    isConfigured: () => Boolean(env.REPLICATE_API_TOKEN),
    async submit(params: GenerateParams): Promise<EngineSubmission> {
      const prediction = await client().predictions.create({
        model,
        input: buildInput(params),
        ...(params.webhookUrl
          ? { webhook: params.webhookUrl, webhook_events_filter: ["completed"] as const }
          : {}),
      });
      return { providerId: prediction.id, pollMode: params.webhookUrl ? "webhook" : "poll" };
    },
    async poll(providerId: string): Promise<EngineStatus> {
      const p = await client().predictions.get(providerId);
      const status = mapStatus(p.status);
      return {
        status,
        videoUrl: status === "succeeded" ? firstUrl(p.output) : undefined,
        error: p.error ? String(p.error) : undefined,
      };
    },
    parseWebhook(body: unknown) {
      const b = body as { id?: string; status?: string; output?: unknown; error?: unknown };
      if (!b?.id || !b.status) return null;
      const status = mapStatus(b.status);
      return {
        providerId: b.id,
        status,
        videoUrl: status === "succeeded" ? firstUrl(b.output) : undefined,
        error: b.error ? String(b.error) : undefined,
      };
    },
  };
}

const klingDuration = (d: number) => (d >= 9 ? 10 : 5); // Kling supports 5s / 10s

export const sora2Engine = makeReplicateEngine("sora2", "openai/sora-2", (p) => ({
  prompt: p.prompt,
  ...(p.imageUrl ? { input_reference: p.imageUrl } : {}),
  aspect_ratio: p.aspectRatio,
  seconds: p.duration,
}));

export const klingEngine = makeReplicateEngine("kling", "kwaivgi/kling-v2.5-turbo-pro", (p) => ({
  prompt: p.prompt,
  ...(p.imageUrl ? { start_image: p.imageUrl } : {}),
  duration: klingDuration(p.duration),
  aspect_ratio: (p.aspectRatio satisfies AspectRatio) as string,
}));
