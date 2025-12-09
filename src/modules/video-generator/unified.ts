/**
 * Unified Video Generator
 * Supports multiple video generation engines: Kling (Sora-style) and HeyGen (lip-sync)
 *
 * Features:
 * - Single interface for both engines
 * - Parallel generation for comparison
 * - Engine selection based on use case
 */

import { VideoGenerator, type VideoRequest, type VideoResult } from './index.js';
import { HeyGenGenerator, type HeyGenTalkingPhotoRequest, type HeyGenVideoResult } from './heygen.js';

export type VideoEngine = 'kling' | 'heygen' | 'both';

export interface UnifiedVideoRequest {
  /** First frame image (base64) - used by Kling */
  firstFrameImage?: string;
  /** Prompt for video generation - used by Kling */
  prompt?: string;
  /** Video duration in seconds */
  duration?: number;
  /** Aspect ratio */
  aspectRatio?: '9:16' | '16:9' | '1:1';

  // HeyGen specific
  /** Talking photo ID (HeyGen preset) */
  talkingPhotoId?: string;
  /** Image URL for HeyGen */
  imageUrl?: string;
  /** Audio URL for lip-sync */
  audioUrl?: string;
  /** Text to speak (if no audio) */
  text?: string;
  /** Voice ID for TTS */
  voiceId?: string;
}

export interface UnifiedVideoResult {
  engine: VideoEngine;
  success: boolean;
  videoUrl?: string;
  localPath?: string;
  duration?: number;
  error?: string;
  processingTime: number;
}

export interface ComparisonResult {
  kling?: UnifiedVideoResult;
  heygen?: UnifiedVideoResult;
  recommendation?: 'kling' | 'heygen';
}

export interface UnifiedGeneratorOptions {
  /** Replicate API token for Kling */
  replicateApiToken?: string;
  /** HeyGen API key */
  heygenApiKey?: string;
  /** Default engine to use */
  defaultEngine?: VideoEngine;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Unified Video Generator
 * Provides a single interface for multiple video generation engines
 */
export class UnifiedVideoGenerator {
  private klingGenerator: VideoGenerator | null = null;
  private heygenGenerator: HeyGenGenerator | null = null;
  private defaultEngine: VideoEngine;
  private verbose: boolean;

  constructor(options: UnifiedGeneratorOptions = {}) {
    this.defaultEngine = options.defaultEngine || 'kling';
    this.verbose = options.verbose || false;

    // Initialize Kling if token available
    const replicateToken = options.replicateApiToken || process.env.REPLICATE_API_TOKEN;
    if (replicateToken) {
      this.klingGenerator = new VideoGenerator({
        replicateApiToken: replicateToken,
      });
      this.log('Kling generator initialized');
    }

    // Initialize HeyGen if key available
    const heygenKey = options.heygenApiKey || process.env.HEYGEN_API_KEY;
    if (heygenKey) {
      this.heygenGenerator = new HeyGenGenerator({
        apiKey: heygenKey,
      });
      this.log('HeyGen generator initialized');
    }
  }

  /**
   * Generate video using specified engine
   */
  async generate(
    request: UnifiedVideoRequest,
    engine?: VideoEngine
  ): Promise<UnifiedVideoResult> {
    const selectedEngine = engine || this.defaultEngine;
    const startTime = Date.now();

    this.log(`Generating video with ${selectedEngine}...`);

    try {
      if (selectedEngine === 'kling') {
        return await this.generateWithKling(request, startTime);
      } else if (selectedEngine === 'heygen') {
        return await this.generateWithHeyGen(request, startTime);
      } else {
        throw new Error(`Unknown engine: ${selectedEngine}`);
      }
    } catch (error) {
      return {
        engine: selectedEngine,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate with both engines in parallel for comparison
   */
  async generateBoth(request: UnifiedVideoRequest): Promise<ComparisonResult> {
    this.log('Generating with both engines in parallel...');

    const [klingResult, heygenResult] = await Promise.allSettled([
      this.generate(request, 'kling'),
      this.generate(request, 'heygen'),
    ]);

    const result: ComparisonResult = {};

    if (klingResult.status === 'fulfilled') {
      result.kling = klingResult.value;
    } else {
      result.kling = {
        engine: 'kling',
        success: false,
        error: klingResult.reason?.message || 'Unknown error',
        processingTime: 0,
      };
    }

    if (heygenResult.status === 'fulfilled') {
      result.heygen = heygenResult.value;
    } else {
      result.heygen = {
        engine: 'heygen',
        success: false,
        error: heygenResult.reason?.message || 'Unknown error',
        processingTime: 0,
      };
    }

    // Simple recommendation based on success
    if (result.kling?.success && !result.heygen?.success) {
      result.recommendation = 'kling';
    } else if (result.heygen?.success && !result.kling?.success) {
      result.recommendation = 'heygen';
    } else if (result.kling?.success && result.heygen?.success) {
      // Both succeeded - recommend based on use case
      // HeyGen is better for lip-sync, Kling for motion
      result.recommendation = request.text || request.audioUrl ? 'heygen' : 'kling';
    }

    return result;
  }

  /**
   * Check which engines are available
   */
  getAvailableEngines(): VideoEngine[] {
    const engines: VideoEngine[] = [];
    if (this.klingGenerator) engines.push('kling');
    if (this.heygenGenerator) engines.push('heygen');
    return engines;
  }

  /**
   * Get recommended engine for the request
   */
  getRecommendedEngine(request: UnifiedVideoRequest): VideoEngine {
    // If lip-sync content (text or audio), recommend HeyGen
    if (request.text || request.audioUrl || request.talkingPhotoId) {
      return this.heygenGenerator ? 'heygen' : 'kling';
    }

    // For motion/animation, recommend Kling
    if (request.prompt && request.firstFrameImage) {
      return this.klingGenerator ? 'kling' : 'heygen';
    }

    // Default
    return this.defaultEngine;
  }

  // Private methods

  private async generateWithKling(
    request: UnifiedVideoRequest,
    startTime: number
  ): Promise<UnifiedVideoResult> {
    if (!this.klingGenerator) {
      throw new Error('Kling generator not initialized. Set REPLICATE_API_TOKEN.');
    }

    if (!request.prompt) {
      throw new Error('Prompt is required for Kling generation');
    }

    const klingRequest: VideoRequest = {
      firstFrameImage: request.firstFrameImage || '',
      prompt: request.prompt,
      duration: request.duration,
      aspectRatio: request.aspectRatio,
    };

    const result = await this.klingGenerator.generateAndWait(klingRequest);

    return {
      engine: 'kling',
      success: true,
      videoUrl: result.videoUrl,
      duration: result.duration,
      processingTime: Date.now() - startTime,
    };
  }

  private async generateWithHeyGen(
    request: UnifiedVideoRequest,
    startTime: number
  ): Promise<UnifiedVideoResult> {
    if (!this.heygenGenerator) {
      throw new Error('HeyGen generator not initialized. Set HEYGEN_API_KEY.');
    }

    if (!request.talkingPhotoId && !request.imageUrl) {
      throw new Error('talkingPhotoId or imageUrl is required for HeyGen');
    }

    const heygenRequest: HeyGenTalkingPhotoRequest = {
      imageUrl: request.imageUrl || '',
      audioUrl: request.audioUrl,
      text: request.text,
      voiceId: request.voiceId,
      aspectRatio: request.aspectRatio,
    };

    // If using talking photo ID, we need to call a different method
    // For now, use the standard generation
    const result = await this.heygenGenerator.generateAndWait(heygenRequest);

    return {
      engine: 'heygen',
      success: true,
      videoUrl: result.videoUrl,
      processingTime: Date.now() - startTime,
    };
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[UnifiedVideoGenerator] ${message}`);
    }
  }
}

/**
 * Factory function
 */
export function createUnifiedVideoGenerator(
  options?: UnifiedGeneratorOptions
): UnifiedVideoGenerator {
  return new UnifiedVideoGenerator(options);
}
