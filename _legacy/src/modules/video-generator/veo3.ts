/**
 * Google Veo 3 Video Generator Module
 * via Gemini API
 *
 * Features:
 * - Text-to-Video generation
 * - Image-to-Video generation
 * - Native audio generation (dialogue, effects, music)
 * - 720p / 1080p resolution
 * - 8 second videos (extendable to ~148s)
 *
 * Docs: https://developers.googleblog.com/en/veo-3-now-available-gemini-api/
 */

export interface Veo3VideoRequest {
  /** Text prompt describing the video */
  prompt: string;
  /** Image URL or base64 for I2V (optional) */
  imageUrl?: string;
  imageBase64?: string;
  /** Video resolution */
  resolution?: '720p' | '1080p';
  /** Enable audio generation */
  enableAudio?: boolean;
  /** Model variant */
  model?: 'veo-3.0-generate-001' | 'veo-3.0-fast-generate-001' | 'veo-3.1-generate-preview';
  /** Aspect ratio */
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

export interface Veo3VideoStatus {
  /** Operation name/ID */
  operationId: string;
  /** Current status */
  status: 'pending' | 'running' | 'completed' | 'failed';
  /** Video URL when completed */
  videoUrl?: string;
  /** Audio URL if separate */
  audioUrl?: string;
  /** Error message if failed */
  error?: string;
}

export interface Veo3VideoResult {
  /** Operation ID */
  operationId: string;
  /** Video URL */
  videoUrl: string;
  /** Has audio */
  hasAudio: boolean;
  /** Duration in seconds */
  duration: number;
  /** Processing time in ms */
  processingTime: number;
}

export interface Veo3GeneratorOptions {
  /** Gemini API key (defaults to GEMINI_API_KEY env var) */
  apiKey?: string;
  /** Maximum wait time in milliseconds (default: 5 minutes) */
  maxWaitTime?: number;
  /** Polling interval in milliseconds (default: 5 seconds) */
  pollInterval?: number;
}

/**
 * Veo 3 Video Generator
 * Creates videos with native audio using Google Veo 3 via Gemini API
 */
export class Veo3Generator {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly maxWaitTime: number;
  private readonly pollInterval: number;

  constructor(options: Veo3GeneratorOptions = {}) {
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key is required. Set GEMINI_API_KEY environment variable.');
    }
    this.apiKey = apiKey;
    this.maxWaitTime = options.maxWaitTime || 5 * 60 * 1000; // 5 minutes
    this.pollInterval = options.pollInterval || 5000; // 5 seconds
  }

  /**
   * Start video generation
   */
  async generate(request: Veo3VideoRequest): Promise<Veo3VideoStatus> {
    const model = request.model || 'veo-3.0-fast-generate-001';
    const hasImage = !!(request.imageUrl || request.imageBase64);

    console.log('🎬 [Veo3] Starting video generation via Gemini API...');
    console.log(`   Model: ${model}`);
    console.log(`   Mode: ${hasImage ? 'Image-to-Video' : 'Text-to-Video'}`);
    console.log(`   Audio: ${request.enableAudio !== false ? 'enabled' : 'disabled'}`);
    console.log(`   Prompt: ${request.prompt.substring(0, 50)}...`);

    // Build request body
    const instance: Record<string, unknown> = {
      prompt: request.prompt,
    };

    // Add image for I2V
    if (hasImage) {
      let imageData = request.imageBase64;
      let mimeType = 'image/png';

      if (request.imageUrl && !imageData) {
        // Fetch image from URL
        const response = await fetch(request.imageUrl);
        const contentType = response.headers.get('content-type');
        if (contentType) mimeType = contentType;
        const buffer = await response.arrayBuffer();
        imageData = Buffer.from(buffer).toString('base64');
      }

      if (imageData) {
        // Extract mime type from data URI if present
        const dataUriMatch = imageData.match(/^data:(image\/\w+);base64,/);
        if (dataUriMatch) {
          mimeType = dataUriMatch[1];
          imageData = imageData.replace(/^data:image\/\w+;base64,/, '');
        }

        instance.image = {
          bytesBase64Encoded: imageData,
          mimeType: mimeType,
        };
      }
    }

    const parameters: Record<string, unknown> = {
      sampleCount: 1,
      aspectRatio: request.aspectRatio || '9:16',
      durationSeconds: 8,
    };

    // Only add generateAudio if explicitly enabled (paid tier feature)
    if (request.enableAudio === true) {
      parameters.generateAudio = true;
    }

    const requestBody: Record<string, unknown> = {
      instances: [instance],
      parameters,
    };

    const endpoint = `${this.baseUrl}/models/${model}:predictLongRunning`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      const error = data.error as { message?: string } | undefined;
      throw new Error(`Veo3 API error: ${error?.message || JSON.stringify(data)}`);
    }

    const operationId = data.name as string;
    console.log(`   Operation ID: ${operationId}`);

    return {
      operationId,
      status: 'pending',
    };
  }

  /**
   * Check generation status
   */
  async checkStatus(operationId: string): Promise<Veo3VideoStatus> {
    const endpoint = `${this.baseUrl}/${operationId}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'x-goog-api-key': this.apiKey,
      },
    });

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      return {
        operationId,
        status: 'failed',
        error: (data.error as { message?: string })?.message || JSON.stringify(data),
      };
    }

    // Check if done
    const done = data.done as boolean;
    if (!done) {
      return {
        operationId,
        status: 'running',
      };
    }

    // Check for error
    const error = data.error as { message?: string } | undefined;
    if (error) {
      return {
        operationId,
        status: 'failed',
        error: error.message,
      };
    }

    // Extract video URL from response
    // Format: .response.generateVideoResponse.generatedSamples[0].video.uri
    const result = data.response as Record<string, unknown> | undefined;
    const generateVideoResponse = result?.generateVideoResponse as Record<string, unknown> | undefined;
    const generatedSamples = generateVideoResponse?.generatedSamples as Array<Record<string, unknown>> | undefined;
    const video = generatedSamples?.[0]?.video as Record<string, unknown> | undefined;
    const videoUrl = video?.uri as string | undefined;

    // Try alternative formats
    let finalVideoUrl = videoUrl;
    if (!finalVideoUrl) {
      // Try direct predictions format
      const predictions = result?.predictions as Array<Record<string, unknown>> | undefined;
      finalVideoUrl = predictions?.[0]?.videoUri as string | undefined;
    }

    if (!finalVideoUrl) {
      console.log('   [Debug] Response:', JSON.stringify(data, null, 2).substring(0, 500));
      return {
        operationId,
        status: 'failed',
        error: 'No video URL in response',
      };
    }

    return {
      operationId,
      status: 'completed',
      videoUrl: finalVideoUrl,
    };
  }

  /**
   * Generate and wait for completion
   */
  async generateAndWait(request: Veo3VideoRequest): Promise<Veo3VideoResult> {
    const startTime = Date.now();
    const generation = await this.generate(request);

    console.log(`🎬 [Veo3] Waiting for video ${generation.operationId}...`);

    while (true) {
      const elapsed = Date.now() - startTime;

      if (elapsed > this.maxWaitTime) {
        throw new Error(`Veo3 video generation timeout after ${this.maxWaitTime}ms`);
      }

      const status = await this.checkStatus(generation.operationId);
      const elapsedSec = Math.floor(elapsed / 1000);

      if (status.status === 'completed' && status.videoUrl) {
        console.log(`✅ [Veo3] Video completed: ${status.videoUrl}`);
        return {
          operationId: generation.operationId,
          videoUrl: status.videoUrl,
          hasAudio: request.enableAudio !== false,
          duration: 8, // Veo 3 generates 8-second videos
          processingTime: Date.now() - startTime,
        };
      }

      if (status.status === 'failed') {
        throw new Error(`Veo3 video generation failed: ${status.error || 'Unknown error'}`);
      }

      console.log(`   [${elapsedSec}s] ${status.status}...`);
      await this.sleep(this.pollInterval);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create Veo3 generator
 */
export function createVeo3Generator(options?: Veo3GeneratorOptions): Veo3Generator {
  return new Veo3Generator(options);
}
