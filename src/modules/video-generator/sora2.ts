/**
 * Sora 2 Video Generator Module
 * OpenAI's flagship video generation model via Replicate
 *
 * Features:
 * - Text-to-Video generation
 * - Image-to-Video generation
 * - Native audio sync (dialogue, effects, music)
 * - Advanced physics simulation
 * - Up to 12-second videos
 *
 * Model: openai/sora-2
 * Docs: https://replicate.com/openai/sora-2
 */

import Replicate from 'replicate';

export interface Sora2VideoRequest {
  /** Text prompt describing the video */
  prompt: string;
  /** First frame image in base64 (optional for I2V) */
  firstFrameImage?: string;
  /** Video resolution */
  resolution?: '480p' | '720p' | '1080p';
  /** Video duration in seconds (max 12) */
  duration?: number;
  /** Aspect ratio */
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

export interface Sora2VideoResult {
  /** Prediction ID */
  id: string;
  /** Video URL */
  videoUrl: string;
  /** Duration in seconds */
  duration: number;
  /** Processing time in ms */
  processingTime: number;
}

export interface Sora2GeneratorOptions {
  /** Replicate API token (defaults to REPLICATE_API_TOKEN env var) */
  replicateApiToken?: string;
  /** OpenAI API key for direct billing (optional) */
  openaiApiKey?: string;
  /** Maximum wait time in milliseconds (default: 5 minutes) */
  maxWaitTime?: number;
  /** Polling interval in milliseconds (default: 5 seconds) */
  pollInterval?: number;
  /** Use mock for testing */
  useMock?: boolean;
}

/**
 * Sora 2 Video Generator
 * Creates high-quality videos with audio using OpenAI Sora 2 via Replicate
 */
export class Sora2Generator {
  private replicate: Replicate;
  private openaiApiKey?: string;
  private maxWaitTime: number;
  private pollInterval: number;
  private useMock: boolean;

  constructor(options: Sora2GeneratorOptions = {}) {
    const apiToken = options.replicateApiToken || process.env.REPLICATE_API_TOKEN;
    if (!apiToken && !options.useMock) {
      throw new Error('Replicate API token is required. Set REPLICATE_API_TOKEN environment variable.');
    }

    this.replicate = new Replicate({
      auth: apiToken,
    });
    this.openaiApiKey = options.openaiApiKey || process.env.OPENAI_API_KEY;
    this.maxWaitTime = options.maxWaitTime || 5 * 60 * 1000; // 5 minutes
    this.pollInterval = options.pollInterval || 5000; // 5 seconds
    this.useMock = options.useMock || false;
  }

  /**
   * Generate video with Sora 2
   */
  async generateAndWait(request: Sora2VideoRequest): Promise<Sora2VideoResult> {
    const startTime = Date.now();

    console.log('🎬 [Sora2] Starting video generation via Replicate...');
    console.log(`   Prompt: ${request.prompt.substring(0, 50)}...`);
    console.log(`   Duration: ${request.duration || 5}s`);
    console.log(`   Resolution: ${request.resolution || '720p'}`);

    if (this.useMock) {
      console.log('   [Mock mode]');
      await this.sleep(2000);
      return {
        id: 'mock-sora2-' + Date.now(),
        videoUrl: 'https://example.com/mock-sora2-video.mp4',
        duration: request.duration || 5,
        processingTime: Date.now() - startTime,
      };
    }

    try {
      // Build input parameters
      const input: Record<string, unknown> = {
        prompt: request.prompt,
        duration: request.duration || 5,
        resolution: request.resolution || '720p',
        aspect_ratio: request.aspectRatio || '9:16',
      };

      // Add first frame image for I2V
      if (request.firstFrameImage) {
        const base64Data = request.firstFrameImage.replace(/^data:image\/\w+;base64,/, '');
        input.image = `data:image/jpeg;base64,${base64Data}`;
      }

      // Add OpenAI API key if available (for direct billing)
      if (this.openaiApiKey) {
        input.openai_api_key = this.openaiApiKey;
      }

      console.log('   Creating prediction...');

      // Run Sora 2 model
      const output = await this.replicate.run(
        'openai/sora-2',
        { input },
        (prediction) => {
          if (prediction.status === 'processing') {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            console.log(`   [${elapsed}s] Processing...`);
          }
        }
      );

      // Handle output
      let videoUrl: string;
      if (typeof output === 'string') {
        videoUrl = output;
      } else if (Array.isArray(output) && output.length > 0) {
        videoUrl = output[0];
      } else if (output && typeof output === 'object' && 'url' in output) {
        videoUrl = (output as { url: string }).url;
      } else {
        throw new Error('Unexpected output format from Sora 2');
      }

      console.log(`✅ [Sora2] Video completed: ${videoUrl}`);

      return {
        id: 'sora2-' + Date.now(),
        videoUrl,
        duration: request.duration || 5,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`❌ [Sora2] Error:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create Sora2 generator
 */
export function createSora2Generator(options?: Sora2GeneratorOptions): Sora2Generator {
  return new Sora2Generator(options);
}
