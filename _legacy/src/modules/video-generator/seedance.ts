/**
 * Seedance Video Generator Module
 * ByteDance Seedance 1.0 Pro - World's #1 Ranked Video Generation Model
 *
 * Direct connection to BytePlus ModelArk API
 * https://docs.byteplus.com/en/docs/ModelArk/Video_Generation_API
 *
 * Features:
 * - Image-to-Video (I2V) generation
 * - Text-to-Video (T2V) generation
 * - 480p / 720p / 1080p resolution
 * - 5-10 second duration
 * - Cinematic quality output
 */

export interface SeedanceVideoRequest {
  /** Image URL for I2V */
  imageUrl?: string;
  /** Base64 encoded image for I2V */
  imageBase64?: string;
  /** Text prompt describing the video */
  prompt: string;
  /** Negative prompt (what to avoid) */
  negativePrompt?: string;
  /** Video resolution */
  resolution?: '480p' | '720p' | '1080p';
  /** Aspect ratio */
  aspectRatio?: '1:1' | '3:4' | '4:3' | '16:9' | '9:16' | '21:9';
  /** Video duration in seconds (2-12) */
  duration?: number;
  /** Random seed for reproducibility */
  seed?: number;
}

export interface SeedanceVideoStatus {
  /** Task ID */
  taskId: string;
  /** Current status */
  status: 'submitted' | 'running' | 'success' | 'failed';
  /** Video URL when completed */
  videoUrl?: string;
  /** Video duration */
  videoDuration?: number;
  /** Error message if failed */
  error?: string;
}

export interface SeedanceVideoResult {
  /** Task ID */
  taskId: string;
  /** Public URL to the generated video */
  videoUrl: string;
  /** Video duration in seconds */
  duration: number;
  /** Processing time in ms */
  processingTime: number;
}

export interface SeedanceGeneratorOptions {
  /** ModelArk API key (defaults to ARK_API_KEY env var) */
  apiKey?: string;
  /** Endpoint ID (defaults to ARK_ENDPOINT_ID env var) */
  endpointId?: string;
  /** Maximum wait time in milliseconds (default: 5 minutes) */
  maxWaitTime?: number;
  /** Polling interval in milliseconds (default: 5 seconds) */
  pollInterval?: number;
}

/**
 * Seedance Video Generator
 * Creates cinematic videos using ByteDance Seedance 1.0 via BytePlus ModelArk
 */
export class SeedanceGenerator {
  private readonly apiKey: string;
  private readonly endpointId: string;
  private readonly baseUrl = 'https://ark.ap-southeast.bytepluses.com/api/v3';
  private readonly maxWaitTime: number;
  private readonly pollInterval: number;

  constructor(options: SeedanceGeneratorOptions = {}) {
    const apiKey = options.apiKey || process.env.ARK_API_KEY;
    if (!apiKey) {
      throw new Error('ModelArk API key is required. Set ARK_API_KEY environment variable.');
    }
    const endpointId = options.endpointId || process.env.ARK_ENDPOINT_ID;
    if (!endpointId) {
      throw new Error('ModelArk Endpoint ID is required. Set ARK_ENDPOINT_ID environment variable.');
    }
    this.apiKey = apiKey;
    this.endpointId = endpointId;
    this.maxWaitTime = options.maxWaitTime || 5 * 60 * 1000; // 5 minutes
    this.pollInterval = options.pollInterval || 5000; // 5 seconds
  }

  /**
   * Build prompt with parameters
   */
  private buildPrompt(request: SeedanceVideoRequest): string {
    let prompt = request.prompt;

    // Append parameters as per ModelArk format
    const params: string[] = [];

    if (request.resolution) {
      params.push(`--resolution ${request.resolution}`);
    }

    if (request.aspectRatio) {
      params.push(`--ar ${request.aspectRatio}`);
    }

    if (request.duration) {
      params.push(`--dur ${request.duration}`);
    }

    if (request.seed !== undefined) {
      params.push(`--seed ${request.seed}`);
    }

    if (params.length > 0) {
      prompt += ' ' + params.join(' ');
    }

    return prompt;
  }

  /**
   * Start video generation
   */
  async generate(request: SeedanceVideoRequest): Promise<SeedanceVideoStatus> {
    const hasImage = !!(request.imageUrl || request.imageBase64);

    // Build content array
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    // Add image first if provided (for I2V)
    if (hasImage) {
      let imageUrl = request.imageUrl;
      if (request.imageBase64 && !imageUrl) {
        const base64Data = request.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        imageUrl = `data:image/jpeg;base64,${base64Data}`;
      }
      content.push({
        type: 'image_url',
        image_url: { url: imageUrl! },
      });
    }

    // Add text prompt
    content.push({
      type: 'text',
      text: this.buildPrompt(request),
    });

    const body = {
      model: this.endpointId,
      content,
    };

    console.log('🎬 [Seedance] Starting video generation via BytePlus ModelArk...');
    console.log(`   Endpoint: ${this.endpointId}`);
    console.log(`   Mode: ${hasImage ? 'Image-to-Video' : 'Text-to-Video'}`);
    console.log(`   Prompt: ${request.prompt.substring(0, 50)}...`);

    const response = await fetch(`${this.baseUrl}/contents/generations/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      const errorData = data as { error?: { message?: string; code?: string } };
      const errorMsg = errorData.error?.message || JSON.stringify(data);
      throw new Error(`Seedance API error: ${errorMsg}`);
    }

    const taskId = (data.id || data.task_id) as string;

    console.log(`   Task ID: ${taskId}`);

    return {
      taskId,
      status: 'submitted',
    };
  }

  /**
   * Check generation status
   */
  async checkStatus(taskId: string): Promise<SeedanceVideoStatus> {
    const response = await fetch(
      `${this.baseUrl}/contents/generations/tasks/${taskId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      return {
        taskId,
        status: 'failed',
        error: (data as { error?: { message?: string } }).error?.message || JSON.stringify(data),
      };
    }

    // Parse status
    const status = data.status as string;
    let normalizedStatus: SeedanceVideoStatus['status'] = 'submitted';

    if (status === 'running' || status === 'processing') {
      normalizedStatus = 'running';
    } else if (status === 'success' || status === 'completed' || status === 'succeeded') {
      normalizedStatus = 'success';
    } else if (status === 'failed' || status === 'error') {
      normalizedStatus = 'failed';
    }

    // Extract video URL from response - handle various formats
    let videoUrl: string | undefined;

    // Format 1: content array
    const content = data.content;
    if (Array.isArray(content)) {
      const videoContent = content.find((c: Record<string, unknown>) => c.type === 'video_url');
      videoUrl = (videoContent?.video_url as { url?: string })?.url;
    }

    // Format 2: content object with video_url
    if (!videoUrl && content && typeof content === 'object' && !Array.isArray(content)) {
      const contentObj = content as { video_url?: { url?: string } | string };
      if (typeof contentObj.video_url === 'string') {
        videoUrl = contentObj.video_url;
      } else {
        videoUrl = contentObj.video_url?.url;
      }
    }

    // Format 3: output object
    if (!videoUrl) {
      const output = data.output as { video_url?: string; url?: string } | undefined;
      videoUrl = output?.video_url || output?.url;
    }

    // Format 4: direct video_url field
    if (!videoUrl) {
      videoUrl = data.video_url as string | undefined;
    }

    // Format 5: result field
    if (!videoUrl) {
      const result = data.result as { video_url?: string } | undefined;
      videoUrl = result?.video_url;
    }

    // Debug: log response structure
    if (normalizedStatus === 'success' && !videoUrl) {
      console.log('   [Debug] Response keys:', Object.keys(data));
      console.log('   [Debug] Full response:', JSON.stringify(data, null, 2).substring(0, 500));
    }

    return {
      taskId,
      status: normalizedStatus,
      videoUrl,
      error: data.error as string | undefined,
    };
  }

  /**
   * Generate and wait for completion
   */
  async generateAndWait(request: SeedanceVideoRequest): Promise<SeedanceVideoResult> {
    const startTime = Date.now();
    const generation = await this.generate(request);

    console.log(`🎬 [Seedance] Waiting for video ${generation.taskId}...`);

    while (true) {
      const elapsed = Date.now() - startTime;

      if (elapsed > this.maxWaitTime) {
        throw new Error(`Seedance video generation timeout after ${this.maxWaitTime}ms`);
      }

      const status = await this.checkStatus(generation.taskId);
      const elapsedSec = Math.floor(elapsed / 1000);

      if (status.status === 'success' && status.videoUrl) {
        console.log(`✅ [Seedance] Video completed: ${status.videoUrl}`);
        return {
          taskId: generation.taskId,
          videoUrl: status.videoUrl,
          duration: request.duration || 5,
          processingTime: Date.now() - startTime,
        };
      }

      if (status.status === 'failed') {
        throw new Error(`Seedance video generation failed: ${status.error || 'Unknown error'}`);
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
 * Factory function to create Seedance generator
 */
export function createSeedanceGenerator(options?: SeedanceGeneratorOptions): SeedanceGenerator {
  return new SeedanceGenerator(options);
}
