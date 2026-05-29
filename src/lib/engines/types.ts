/**
 * Video engine abstraction — unified contract over Sora 2 / Veo 3 / Kling / Seedance / HeyGen.
 * Designed for Vercel's async model: submit() kicks off the provider job and returns
 * immediately; poll() (or a webhook) reports progress without holding a long request open.
 */

export type EngineId = "sora2" | "veo3" | "kling" | "seedance" | "heygen";

export type AspectRatio = "9:16" | "16:9" | "1:1";

export type Lang = "ja" | "en" | "zh";

export type ProviderStatus = "pending" | "processing" | "succeeded" | "failed";

export interface GenerateParams {
  /** Final video-generation prompt (English, scene-merged). */
  prompt: string;
  /** Product first-frame image (public URL preferred for providers that fetch by URL). */
  imageUrl?: string;
  /** Same image as base64 (for providers that accept inline data). */
  imageBase64?: string;
  /** Duration in seconds. */
  duration: number;
  aspectRatio: AspectRatio;
  /** Spoken narration (talent / lip-sync engines). */
  narration?: string;
  /** Talent / presenter image URL (HeyGen talking photo, etc.). */
  talentImageUrl?: string;
  /** Provider voice id (HeyGen / TTS). */
  voiceId?: string;
  /** Webhook URL for providers that support callbacks (Replicate). */
  webhookUrl?: string;
}

export interface EngineSubmission {
  /** Provider-side id: Replicate prediction id, ModelArk task id, Veo operation name, HeyGen video id. */
  providerId: string;
  /** How completion is detected for this provider. */
  pollMode: "webhook" | "poll";
}

export interface EngineStatus {
  status: ProviderStatus;
  /** 0–100 if the provider exposes it. */
  progress?: number;
  /** Public video URL when succeeded. */
  videoUrl?: string;
  error?: string;
}

export interface VideoEngine {
  readonly id: EngineId;
  /** True when the required API credentials are present in the environment. */
  isConfigured(): boolean;
  /** Kick off generation; returns the provider job handle. */
  submit(params: GenerateParams): Promise<EngineSubmission>;
  /** Query provider job status by providerId. */
  poll(providerId: string): Promise<EngineStatus>;
  /** Parse a provider webhook body (only for webhook engines). */
  parseWebhook?(body: unknown): (EngineStatus & { providerId: string }) | null;
}
