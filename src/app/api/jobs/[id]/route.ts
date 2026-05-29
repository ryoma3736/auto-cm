import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engines";
import { getJob, rollupStatus, saveJob } from "@/lib/jobs/store";
import { persistVideo } from "@/lib/blob";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Poll endpoint. Each call advances any in-flight engine runs by querying the provider,
 * then returns the current job. Calls return fast (one provider status check each), so the
 * client can poll on an interval without ever holding a long-running request open.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = await getJob(id);
  if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });

  const pending = Object.values(job.runs).filter(
    (r) => (r.status === "processing" || r.status === "pending") && r.providerId,
  );

  await Promise.all(
    pending.map(async (run) => {
      try {
        const status = await getEngine(run.engine).poll(run.providerId!);
        run.status = status.status;
        run.progress = status.progress ?? run.progress;
        run.error = status.error;
        if (status.status === "succeeded" && status.videoUrl) {
          run.videoUrl = await persistVideo(status.videoUrl, job.id, run.engine);
        }
      } catch (e) {
        run.error = String(e);
      }
    }),
  );

  job.status = rollupStatus(job);
  await saveJob(job);
  return NextResponse.json(job);
}
