import { Redis } from "@upstash/redis";
import { env, hasKV } from "@/lib/env";
import type { EngineId, EngineStatus, ProviderStatus } from "@/lib/engines/types";

export interface EngineRun extends EngineStatus {
  engine: EngineId;
  providerId?: string;
  pollMode?: "webhook" | "poll";
}

export interface Job {
  id: string;
  status: ProviderStatus;
  engines: EngineId[];
  runs: Record<string, EngineRun>;
  prompt: string;
  createdAt: number;
  updatedAt: number;
}

const TTL_SECONDS = 60 * 60 * 24; // 1 day
const key = (id: string) => `autocm:job:${id}`;

/**
 * In-memory fallback used for local dev when KV is not configured.
 * NOTE: on serverless this does NOT persist across invocations — production requires KV.
 */
const memory = new Map<string, Job>();

const redis = hasKV()
  ? new Redis({ url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN })
  : null;

export async function createJob(job: Job): Promise<void> {
  if (redis) {
    await redis.set(key(job.id), job, { ex: TTL_SECONDS });
  } else {
    memory.set(job.id, job);
  }
}

export async function getJob(id: string): Promise<Job | null> {
  if (redis) {
    return (await redis.get<Job>(key(id))) ?? null;
  }
  return memory.get(id) ?? null;
}

export async function saveJob(job: Job): Promise<void> {
  job.updatedAt = Date.now();
  if (redis) {
    await redis.set(key(job.id), job, { ex: TTL_SECONDS });
  } else {
    memory.set(job.id, job);
  }
}

/** Recompute the aggregate job status from its per-engine runs. */
export function rollupStatus(job: Job): ProviderStatus {
  const runs = Object.values(job.runs);
  if (runs.length === 0) return "pending";
  if (runs.some((r) => r.status === "processing" || r.status === "pending")) {
    return runs.some((r) => r.status === "succeeded") ? "processing" : "processing";
  }
  if (runs.some((r) => r.status === "succeeded")) return "succeeded";
  return "failed";
}
