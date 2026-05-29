/** Centralised, type-safe access to runtime environment variables (server-only). */

export const env = {
  // AI / analysis + script
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  GEMINI_ANALYSIS_MODEL: process.env.GEMINI_ANALYSIS_MODEL ?? "gemini-2.0-flash",
  GEMINI_SCRIPT_MODEL: process.env.GEMINI_SCRIPT_MODEL ?? "gemini-2.0-flash",

  // Video engines
  REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN ?? "",
  ARK_API_KEY: process.env.ARK_API_KEY ?? "",
  ARK_ENDPOINT_ID: process.env.ARK_ENDPOINT_ID ?? "",
  HEYGEN_API_KEY: process.env.HEYGEN_API_KEY ?? "",
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ?? "",

  // Infra
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ?? "",
  KV_REST_API_URL: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "",
  KV_REST_API_TOKEN:
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "",

  // Public base URL (for webhook callbacks)
  APP_URL:
    process.env.APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
} as const;

export function hasKV(): boolean {
  return Boolean(env.KV_REST_API_URL && env.KV_REST_API_TOKEN);
}

export function hasBlob(): boolean {
  return Boolean(env.BLOB_READ_WRITE_TOKEN);
}

/** Whether at least the minimum credentials for a real generation exist. */
export function hasAnalysisProvider(): boolean {
  return Boolean(env.GEMINI_API_KEY || env.OPENAI_API_KEY);
}
