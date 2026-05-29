import { NextResponse } from "next/server";
import { sora2Engine, klingEngine } from "@/lib/engines/replicate";
import { getJob, rollupStatus, saveJob } from "@/lib/jobs/store";
import { persistVideo } from "@/lib/blob";
import type { EngineId } from "@/lib/engines/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Fast-path completion for Replicate engines (sora2 / kling). The webhook URL carries
 * jobId + engine as query params (set in /api/generate), so no reverse index is needed.
 * Poll-based engines and local dev still work via GET /api/jobs/[id].
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");
  const engine = url.searchParams.get("engine") as EngineId | null;
  if (!jobId || !engine) return NextResponse.json({ error: "missing params" }, { status: 400 });

  const job = await getJob(jobId);
  if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });

  const adapter = engine === "kling" ? klingEngine : sora2Engine;
  const parsed = adapter.parseWebhook?.(await req.json());
  const run = job.runs[engine];
  if (parsed && run) {
    run.status = parsed.status;
    run.error = parsed.error;
    if (parsed.status === "succeeded" && parsed.videoUrl) {
      run.videoUrl = await persistVideo(parsed.videoUrl, job.id, engine);
    }
    job.status = rollupStatus(job);
    await saveJob(job);
  }
  return NextResponse.json({ ok: true });
}
