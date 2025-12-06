/**
 * Video Generator Module
 * Generates videos using Sora 2 API via Replicate
 *
 * Replicate provides access to Sora 2 with:
 * - Model: openai/sora-2
 * - Duration: 4, 8, or 12 seconds
 * - Aspect ratio: portrait (720x1280) or landscape (1280x720)
 * - First frame image support
 */

import Replicate from 'replicate';

/**
 * Video generation request configuration
 */
export interface VideoRequest {
  /** Base64-encoded first frame image (720x1280 recommended) */
  firstFrameImage: string;
  /** Prompt for video generation (from UGCScript) */
  prompt: string;
  /** Video duration in seconds (4, 8, or 12) */
  duration?: number;
  /** Aspect ratio for the generated video */
  aspectRatio?: '9:16' | '16:9' | '1:1';
}

/**
 * Initial response from video generation API
 */
export interface VideoGeneration {
  /** Unique generation ID */
  id: string;
  /** Current generation status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** Estimated time to completion in seconds */
  estimatedTimeSeconds: number;
}

/**
 * Status check response
 */
export interface GenerationStatus {
  /** Generation ID */
  id: string;
  /** Current status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** Progress percentage (0-100), if available */
  progress?: number;
  /** Error message, if failed */
  error?: string;
}

/**
 * Final video generation result
 */
export interface VideoResult {
  /** Generation ID */
  id: string;
  /** Public URL to the generated video */
  videoUrl: string;
  /** Base64-encoded video data (optional) */
  videoBase64?: string;
  /** Video duration in seconds */
  duration: number;
  /** Video resolution */
  resolution: { width: number; height: number };
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
}

/**
 * Configuration options for VideoGenerator
 */
export interface VideoGeneratorOptions {
  /** Replicate API token (defaults to REPLICATE_API_TOKEN env var) */
  replicateApiToken?: string;
  /** OpenAI API key to pass to Replicate for direct billing (optional) */
  openaiApiKey?: string;
  /** Maximum wait time for generateAndWait in milliseconds (default: 5 minutes) */
  maxWaitTime?: number;
  /** Polling interval in milliseconds (default: 5 seconds) */
  pollInterval?: number;
  /** Use mock implementation instead of real API */
  useMock?: boolean;
}

/**
 * VideoGenerator class
 * Handles video generation using Sora 2 via Replicate API
 */
export class VideoGenerator {
  private readonly replicate?: Replicate;
  private readonly openaiApiKey?: string;
  private readonly maxWaitTime: number;
  private readonly pollInterval: number;
  private readonly useMock: boolean;

  /**
   * Create a new VideoGenerator instance
   * @param options Configuration options
   */
  constructor(options: VideoGeneratorOptions = {}) {
    const replicateToken = options.replicateApiToken || process.env.REPLICATE_API_TOKEN;
    this.openaiApiKey = options.openaiApiKey || process.env.OPENAI_API_KEY;
    this.maxWaitTime = options.maxWaitTime || 10 * 60 * 1000; // 10 minutes (Sora 2 can take long)
    this.pollInterval = options.pollInterval || 5000; // 5 seconds
    this.useMock = options.useMock ?? !replicateToken;

    if (replicateToken && !this.useMock) {
      this.replicate = new Replicate({
        auth: replicateToken,
      });
    }
  }

  /**
   * Start a video generation job using Replicate Sora 2
   * @param request Video generation request
   * @returns Initial generation response with job ID
   */
  async generate(request: VideoRequest): Promise<VideoGeneration> {
    if (this.useMock) {
      return this.generateMock(request);
    }

    if (!this.replicate) {
      throw new Error('Replicate client not initialized. Set REPLICATE_API_TOKEN.');
    }

    // Convert duration to allowed values (4, 8, or 12)
    const allowedDurations = [4, 8, 12];
    const requestedDuration = request.duration || 12;
    const duration = allowedDurations.reduce((prev, curr) =>
      Math.abs(curr - requestedDuration) < Math.abs(prev - requestedDuration) ? curr : prev
    );

    // Convert aspect ratio to Replicate format
    const aspectRatio = request.aspectRatio === '16:9' ? 'landscape' : 'portrait';

    // Prepare input for Replicate
    const input: Record<string, unknown> = {
      prompt: request.prompt,
      seconds: duration,
      aspect_ratio: aspectRatio,
    };

    // Add first frame image if provided
    if (request.firstFrameImage) {
      // Replicate expects a URL or data URI
      const imageData = request.firstFrameImage.startsWith('data:')
        ? request.firstFrameImage
        : `data:image/jpeg;base64,${request.firstFrameImage}`;
      input.input_reference = imageData;
    }

    // Pass OpenAI API key if available for direct billing
    if (this.openaiApiKey) {
      input.openai_api_key = this.openaiApiKey;
    }

    try {
      // Log the request for debugging
      console.log('🎥 [VideoGenerator] Starting Sora2 generation:');
      console.log(`   Duration: ${duration}s, Aspect: ${aspectRatio}`);
      console.log(`   Prompt length: ${request.prompt?.length || 0} chars`);
      console.log(`   Prompt preview: ${request.prompt?.substring(0, 100)}...`);
      console.log(`   Has first frame: ${!!request.firstFrameImage}`);

      // Create prediction (async - returns immediately with ID)
      const prediction = await this.replicate.predictions.create({
        model: 'openai/sora-2',
        input,
      });

      return {
        id: prediction.id,
        status: this.mapReplicateStatus(prediction.status),
        estimatedTimeSeconds: duration * 10, // Rough estimate
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate video: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check the status of a video generation job
   * @param generationId Generation job ID (Replicate prediction ID)
   * @returns Current status information
   */
  async checkStatus(generationId: string): Promise<GenerationStatus> {
    if (this.useMock) {
      return this.checkStatusMock(generationId);
    }

    if (!this.replicate) {
      throw new Error('Replicate client not initialized');
    }

    try {
      const prediction = await this.replicate.predictions.get(generationId);

      // Log detailed status for debugging
      console.log(`🔄 [VideoGenerator] Status check: ${prediction.status}`);
      if (prediction.status === 'failed') {
        console.error('❌ [VideoGenerator] Replicate failed! Full response:');
        console.error(JSON.stringify(prediction, null, 2));
      }

      return {
        id: prediction.id,
        status: this.mapReplicateStatus(prediction.status),
        progress: this.extractProgress(prediction),
        error: prediction.error ? String(prediction.error) : undefined,
      };
    } catch (error) {
      console.error('❌ [VideoGenerator] Error checking status:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to check status: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Retrieve the final video result
   * @param generationId Generation job ID
   * @returns Video result with URL and metadata
   */
  async getVideo(generationId: string): Promise<VideoResult> {
    if (this.useMock) {
      return this.getVideoMock(generationId);
    }

    if (!this.replicate) {
      throw new Error('Replicate client not initialized');
    }

    const prediction = await this.replicate.predictions.get(generationId);

    if (prediction.status !== 'succeeded') {
      throw new Error(
        `Video generation not completed yet. Current status: ${prediction.status}`
      );
    }

    // Replicate returns output as array or string
    const output = prediction.output;
    let videoUrl: string;

    if (Array.isArray(output)) {
      videoUrl = output[0];
    } else if (typeof output === 'string') {
      videoUrl = output;
    } else {
      throw new Error('Unexpected output format from Replicate');
    }

    // Extract duration from metrics if available
    const metrics = prediction.metrics as Record<string, unknown> | undefined;
    const duration = typeof metrics?.predict_time === 'number' ? 12 : 12; // Default to 12s

    return {
      id: prediction.id,
      videoUrl,
      duration,
      resolution: { width: 720, height: 1280 }, // Default portrait
      createdAt: prediction.created_at || new Date().toISOString(),
    };
  }

  /**
   * Generate video and wait for completion (convenience method)
   * Includes retry logic for content moderation errors
   * @param request Video generation request
   * @returns Final video result
   * @throws Error if timeout or generation fails
   */
  async generateAndWait(request: VideoRequest): Promise<VideoResult> {
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this._generateAndWaitOnce(request, attempt);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if it's a content moderation error (retryable)
        const isContentModerationError = lastError.message.includes('flagged as sensitive') ||
                                         lastError.message.includes('E005');

        if (isContentModerationError && attempt < maxRetries) {
          console.log(`⚠️ [VideoGenerator] Content moderation error, retrying (${attempt}/${maxRetries})...`);
          // Wait a bit before retry
          await this.sleep(2000);
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error('Video generation failed after retries');
  }

  /**
   * Internal method for single generation attempt
   */
  private async _generateAndWaitOnce(request: VideoRequest, attempt: number): Promise<VideoResult> {
    // Log detailed request info for debugging
    console.log(`🎬 [VideoGenerator] generateAndWait called (attempt ${attempt})`);
    console.log(`   Prompt length: ${request.prompt?.length || 0}`);
    console.log(`   Prompt empty: ${!request.prompt || request.prompt.trim() === ''}`);

    if (!request.prompt || request.prompt.trim() === '') {
      console.error('❌ [VideoGenerator] ERROR: Empty or missing sora2Prompt!');
      throw new Error('Video generation failed: Empty prompt provided');
    }

    let generation;
    try {
      generation = await this.generate(request);
      console.log(`🎬 [VideoGenerator] Generation started: ID=${generation.id}`);
    } catch (error) {
      console.error('❌ [VideoGenerator] Failed to start generation:', error);
      throw error;
    }

    const startTime = Date.now();

    while (true) {
      const elapsed = Date.now() - startTime;
      const elapsedSeconds = Math.floor(elapsed / 1000);

      if (elapsed > this.maxWaitTime) {
        console.error(`❌ [VideoGenerator] TIMEOUT after ${elapsedSeconds}s (max: ${this.maxWaitTime / 1000}s)`);
        throw new Error(
          `Video generation timeout after ${this.maxWaitTime}ms`
        );
      }

      let status;
      try {
        status = await this.checkStatus(generation.id);
      } catch (checkError) {
        console.error('❌ [VideoGenerator] Error during status check:', checkError);
        throw new Error(`Failed to check video status: ${checkError instanceof Error ? checkError.message : String(checkError)}`);
      }

      if (status.status === 'completed') {
        console.log(`✅ [VideoGenerator] Video completed after ${elapsedSeconds}s`);
        return await this.getVideo(generation.id);
      }

      if (status.status === 'failed') {
        console.error('❌ [VideoGenerator] Video generation FAILED!');
        console.error('   Error:', status.error);
        console.error('   Full status:', JSON.stringify(status, null, 2));
        throw new Error(
          `Video generation failed: ${status.error || 'Unknown error'}`
        );
      }

      // Wait before next poll
      await this.sleep(this.pollInterval);
    }
  }

  /**
   * Map Replicate status to our status format
   */
  private mapReplicateStatus(
    status: string
  ): 'pending' | 'processing' | 'completed' | 'failed' {
    switch (status) {
      case 'starting':
      case 'queued':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'succeeded':
        return 'completed';
      case 'failed':
      case 'canceled':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Extract progress from Replicate prediction
   */
  private extractProgress(prediction: { status: string; logs?: string }): number | undefined {
    // Replicate doesn't provide explicit progress, estimate from status
    switch (prediction.status) {
      case 'starting':
        return 0;
      case 'queued':
        return 10;
      case 'processing':
        return 50;
      case 'succeeded':
        return 100;
      default:
        return undefined;
    }
  }

  /**
   * Sleep utility for polling
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Mock Implementation (for development when API is not available)
  // ============================================================================

  private mockJobs = new Map<
    string,
    {
      request: VideoRequest;
      startTime: number;
      progress: number;
    }
  >();

  private generateMock(request: VideoRequest): VideoGeneration {
    const id = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.mockJobs.set(id, {
      request,
      startTime: Date.now(),
      progress: 0,
    });

    return {
      id,
      status: 'pending',
      estimatedTimeSeconds: 30,
    };
  }

  private checkStatusMock(generationId: string): GenerationStatus {
    const job = this.mockJobs.get(generationId);

    if (!job) {
      return {
        id: generationId,
        status: 'failed',
        error: 'Generation ID not found',
      };
    }

    const elapsed = Date.now() - job.startTime;
    const simulatedDuration = 15000; // 15 seconds for mock

    if (elapsed < simulatedDuration) {
      const progress = Math.min(
        Math.floor((elapsed / simulatedDuration) * 100),
        99
      );
      job.progress = progress;

      return {
        id: generationId,
        status: progress < 30 ? 'pending' : 'processing',
        progress,
      };
    }

    return {
      id: generationId,
      status: 'completed',
      progress: 100,
    };
  }

  private getVideoMock(generationId: string): VideoResult {
    const job = this.mockJobs.get(generationId);

    if (!job) {
      throw new Error('Generation ID not found');
    }

    const aspectRatio = job.request.aspectRatio || '9:16';
    const resolution =
      aspectRatio === '9:16'
        ? { width: 720, height: 1280 }
        : aspectRatio === '16:9'
          ? { width: 1280, height: 720 }
          : { width: 1080, height: 1080 };

    return {
      id: generationId,
      videoUrl: `https://example.com/mock-videos/${generationId}.mp4`,
      duration: job.request.duration || 12,
      resolution,
      createdAt: new Date(job.startTime).toISOString(),
    };
  }
}

/**
 * Factory function to create a VideoGenerator instance
 * @param options Configuration options
 * @returns Configured VideoGenerator instance
 */
export function createVideoGenerator(
  options?: VideoGeneratorOptions
): VideoGenerator {
  return new VideoGenerator(options);
}
