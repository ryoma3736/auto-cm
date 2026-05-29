import { NextResponse } from "next/server";
import { z } from "zod";
import { getEngine, isEngineLive } from "@/lib/engines";
import type { EngineId, GenerateParams } from "@/lib/engines/types";
import { createJob, rollupStatus, type EngineRun, type Job } from "@/lib/jobs/store";
import { persistUpload } from "@/lib/blob";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  engines: z.array(z.enum(["sora2", "veo3", "kling", "seedance", "heygen"])).min(1).max(5),
  prompt: z.string().min(4),
  imageBase64: z.string().optional(),
  imageUrl: z.string().url().optional(),
  duration: z.number().int().min(4).max(15).default(8),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
  narration: z.string().optional(),
  talentImageUrl: z.string().url().optional(),
  voiceId: z.string().optional(),
});

function dataUrl(base64: string, mime = "image/jpeg"): string {
  return base64.startsWith("data:") ? base64 : `data:${mime};base64,${base64.replace(/^data:[^;]+;base64,/, "")}`;
}

export async function POST(req: Request) {
  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "invalid request", detail: String(e) }, { status: 400 });
  }

  const jobId = crypto.randomUUID();

  // Resolve a usable image reference: prefer a public Blob URL; fall back to a data URL.
  let imageUrl = body.imageUrl;
  if (!imageUrl && body.imageBase64) {
    const du = dataUrl(body.imageBase64);
    if (env.BLOB_READ_WRITE_TOKEN) {
      try {
        const res = await fetch(du);
        const blob = await res.blob();
        imageUrl = (await persistUpload(blob, jobId, "product.jpg")) ?? du;
      } catch {
        imageUrl = du;
      }
    } else {
      imageUrl = du;
    }
  }

  const useWebhook = env.APP_URL.startsWith("https://");
  const runs: Record<string, EngineRun> = {};

  await Promise.all(
    (body.engines as EngineId[]).map(async (id) => {
      const engine = getEngine(id);
      const params: GenerateParams = {
        prompt: body.prompt,
        imageUrl,
        imageBase64: body.imageBase64,
        duration: body.duration,
        aspectRatio: body.aspectRatio,
        narration: body.narration,
        talentImageUrl: body.talentImageUrl,
        voiceId: body.voiceId,
        webhookUrl: useWebhook
          ? `${env.APP_URL}/api/webhooks/replicate?jobId=${jobId}&engine=${id}`
          : undefined,
      };
      try {
        const sub = await engine.submit(params);
        // Mock/demo engines resolve instantly — settle them inline so the flow works even
        // without a persistent KV store (serverless in-memory does not survive invocations).
        if (!isEngineLive(id)) {
          const result = await engine.poll(sub.providerId);
          runs[id] = { engine: id, providerId: sub.providerId, pollMode: "poll", ...result };
        } else {
          runs[id] = {
            engine: id,
            providerId: sub.providerId,
            pollMode: sub.pollMode,
            status: "processing",
          };
        }
      } catch (e) {
        runs[id] = { engine: id, status: "failed", error: String(e) };
      }
    }),
  );

  const job: Job = {
    id: jobId,
    status: "processing",
    engines: body.engines as EngineId[],
    runs,
    prompt: body.prompt,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  job.status = rollupStatus(job);
  await createJob(job);

  return NextResponse.json({ jobId, job });
}
