/**
 * Video Generator Module
 * Generates videos using Sora2 API (OpenAI)
 *
 * This module provides async video generation with polling support.
 * Since the official Sora2 API is not publicly available yet,
 * this implementation includes a mock mode for development.
 */

/**
 * Video generation request configuration
 */
export interface VideoRequest {
  /** Base64-encoded first frame image (720x1280 recommended) */
  firstFrameImage: string;
  /** Prompt for video generation (from UGCScript) */
  prompt: string;
  /** Video duration in seconds (default: 12) */
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
  /** Sora2/OpenAI API key (defaults to SORA2_API_KEY or OPENAI_API_KEY env var) */
  apiKey?: string;
  /** API base URL (defaults to OpenAI endpoint) */
  baseUrl?: string;
  /** Maximum wait time for generateAndWait in milliseconds (default: 5 minutes) */
  maxWaitTime?: number;
  /** Polling interval in milliseconds (default: 5 seconds) */
  pollInterval?: number;
  /** Use mock implementation instead of real API (default: true if no API key) */
  useMock?: boolean;
}

/**
 * Sora2 API request format (based on expected OpenAI structure)
 */
interface Sora2ApiRequest {
  model: string;
  prompt: string;
  first_frame: string;
  duration: number;
  aspect_ratio: string;
}

/**
 * Sora2 API response format (based on expected OpenAI structure)
 */
interface Sora2ApiResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimated_seconds?: number;
  progress?: number;
  video_url?: string;
  error?: string;
  duration?: number;
  resolution?: { width: number; height: number };
  created_at?: string;
}

/**
 * VideoGenerator class
 * Handles video generation using Sora2 API with async polling support
 */
export class VideoGenerator {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxWaitTime: number;
  private readonly pollInterval: number;
  private readonly useMock: boolean;

  /**
   * Create a new VideoGenerator instance
   * @param options Configuration options
   */
  constructor(options: VideoGeneratorOptions = {}) {
    this.apiKey =
      options.apiKey ||
      process.env.SORA2_API_KEY ||
      process.env.OPENAI_API_KEY ||
      '';
    this.baseUrl = options.baseUrl || 'https://api.openai.com/v1';
    this.maxWaitTime = options.maxWaitTime || 5 * 60 * 1000; // 5 minutes
    this.pollInterval = options.pollInterval || 5000; // 5 seconds
    this.useMock = options.useMock ?? !this.apiKey;

    // Note: useMock is readonly, so we handle this in the initialization above
  }

  /**
   * Start a video generation job
   * @param request Video generation request
   * @returns Initial generation response with job ID
   */
  async generate(request: VideoRequest): Promise<VideoGeneration> {
    if (this.useMock) {
      return this.generateMock(request);
    }

    const apiRequest: Sora2ApiRequest = {
      model: 'sora',
      prompt: request.prompt,
      first_frame: request.firstFrameImage.startsWith('data:')
        ? request.firstFrameImage
        : `data:image/jpeg;base64,${request.firstFrameImage}`,
      duration: request.duration || 12,
      aspect_ratio: request.aspectRatio || '9:16',
    };

    try {
      const response = await fetch(`${this.baseUrl}/videos/generations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Sora2 API error (${response.status}): ${errorText}`
        );
      }

      const data = await response.json() as Sora2ApiResponse;

      return {
        id: data.id,
        status: data.status,
        estimatedTimeSeconds: data.estimated_seconds || 120,
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
   * @param generationId Generation job ID
   * @returns Current status information
   */
  async checkStatus(generationId: string): Promise<GenerationStatus> {
    if (this.useMock) {
      return this.checkStatusMock(generationId);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/videos/generations/${generationId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Sora2 API error (${response.status}): ${errorText}`
        );
      }

      const data = await response.json() as Sora2ApiResponse;

      return {
        id: data.id,
        status: data.status,
        progress: data.progress,
        error: data.error,
      };
    } catch (error) {
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

    const status = await this.checkStatus(generationId);

    if (status.status !== 'completed') {
      throw new Error(
        `Video generation not completed yet. Current status: ${status.status}`
      );
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/videos/generations/${generationId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Sora2 API error (${response.status}): ${errorText}`
        );
      }

      const data = await response.json() as Sora2ApiResponse;

      if (!data.video_url) {
        throw new Error('Video URL not available in response');
      }

      return {
        id: data.id,
        videoUrl: data.video_url,
        duration: data.duration || 12,
        resolution: data.resolution || { width: 720, height: 1280 },
        createdAt: data.created_at || new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get video: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate video and wait for completion (convenience method)
   * @param request Video generation request
   * @returns Final video result
   * @throws Error if timeout or generation fails
   */
  async generateAndWait(request: VideoRequest): Promise<VideoResult> {
    const generation = await this.generate(request);
    const startTime = Date.now();

    while (true) {
      const elapsed = Date.now() - startTime;

      if (elapsed > this.maxWaitTime) {
        throw new Error(
          `Video generation timeout after ${this.maxWaitTime}ms`
        );
      }

      const status = await this.checkStatus(generation.id);

      if (status.status === 'completed') {
        return await this.getVideo(generation.id);
      }

      if (status.status === 'failed') {
        throw new Error(
          `Video generation failed: ${status.error || 'Unknown error'}`
        );
      }

      // Wait before next poll
      await this.sleep(this.pollInterval);
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
