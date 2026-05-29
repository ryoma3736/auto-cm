/**
 * HeyGen Video Generator Module
 * Generates lip-synced talking videos using HeyGen Avatar IV API
 *
 * Features:
 * - Talking Photo: Image + Audio → Lip-synced video
 * - Avatar IV: High-quality facial animation
 * - 70+ languages with natural lip-sync
 */

export interface HeyGenTalkingPhotoRequest {
  /** Talking photo ID (preset or uploaded) */
  talkingPhotoId?: string;
  /** Image URL or base64 (person's photo) - for upload */
  imageUrl?: string;
  /** Audio URL or base64 (narration audio) */
  audioUrl?: string;
  /** Text to speak (if no audio provided) */
  text?: string;
  /** Voice ID for TTS (if using text) */
  voiceId?: string;
  /** Aspect ratio */
  aspectRatio?: '9:16' | '16:9' | '1:1';
}

export interface HeyGenVideoStatus {
  /** Video generation ID */
  videoId: string;
  /** Current status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** Progress percentage */
  progress?: number;
  /** Error message if failed */
  error?: string;
  /** Video URL when completed */
  videoUrl?: string;
}

export interface HeyGenVideoResult {
  /** Video ID */
  videoId: string;
  /** Public URL to the generated video */
  videoUrl: string;
  /** Video duration in seconds */
  duration?: number;
  /** Creation timestamp */
  createdAt: string;
}

export interface HeyGenGeneratorOptions {
  /** HeyGen API key (defaults to HEYGEN_API_KEY env var) */
  apiKey?: string;
  /** Maximum wait time in milliseconds (default: 10 minutes) */
  maxWaitTime?: number;
  /** Polling interval in milliseconds (default: 5 seconds) */
  pollInterval?: number;
}

/**
 * HeyGen Video Generator
 * Creates lip-synced talking videos from images
 */
export class HeyGenGenerator {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.heygen.com';
  private readonly uploadUrl = 'https://upload.heygen.com';
  private readonly maxWaitTime: number;
  private readonly pollInterval: number;

  constructor(options: HeyGenGeneratorOptions = {}) {
    const apiKey = options.apiKey || process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      throw new Error('HeyGen API key is required. Set HEYGEN_API_KEY environment variable.');
    }
    this.apiKey = apiKey;
    this.maxWaitTime = options.maxWaitTime || 10 * 60 * 1000; // 10 minutes
    this.pollInterval = options.pollInterval || 5000; // 5 seconds
  }

  /**
   * Generate a talking photo video using Avatar IV
   */
  async generateTalkingPhoto(request: HeyGenTalkingPhotoRequest): Promise<HeyGenVideoStatus> {
    // Build character config based on input
    const characterConfig: Record<string, unknown> = {
      type: 'talking_photo',
    };

    if (request.talkingPhotoId) {
      characterConfig.talking_photo_id = request.talkingPhotoId;
    } else if (request.imageUrl) {
      characterConfig.talking_photo_url = request.imageUrl;
    } else {
      throw new Error('Either talkingPhotoId or imageUrl is required');
    }

    // Build voice config
    const voiceConfig: Record<string, unknown> = request.audioUrl
      ? {
          type: 'audio',
          audio_url: request.audioUrl,
        }
      : {
          type: 'text',
          input_text: request.text || '',
          voice_id: request.voiceId || '662e1397965c484e8f65fa58c77effde', // Satoshi - Japanese male
        };

    // Prepare the request body
    const body: Record<string, unknown> = {
      video_inputs: [
        {
          character: characterConfig,
          voice: voiceConfig,
        },
      ],
      dimension: this.getDimension(request.aspectRatio),
    };

    console.log('🎬 [HeyGen] Starting talking photo generation...');
    console.log(`   TalkingPhotoId: ${request.talkingPhotoId || 'N/A'}`);
    console.log(`   ImageUrl: ${request.imageUrl?.substring(0, 50) || 'N/A'}`);
    console.log(`   Voice: ${request.audioUrl ? 'audio' : 'TTS'}`);

    const response = await this.request('/v2/video/generate', 'POST', body);

    if (response.error) {
      const errorData = response.error as { message?: string };
      throw new Error(`HeyGen API error: ${errorData.message || JSON.stringify(response.error)}`);
    }

    const data = response.data as { video_id?: string } | undefined;
    return {
      videoId: data?.video_id || (response.video_id as string),
      status: 'pending',
    };
  }

  /**
   * Check video generation status
   */
  async checkStatus(videoId: string): Promise<HeyGenVideoStatus> {
    const response = await this.request(`/v1/video_status.get?video_id=${videoId}`, 'GET');

    if (response.error) {
      const errorData = response.error as { message?: string };
      return {
        videoId,
        status: 'failed',
        error: errorData.message || JSON.stringify(response.error),
      };
    }

    const data = response.data as {
      status?: string;
      percent?: number;
      video_url?: string;
      error?: string;
    } | undefined;

    const status = this.mapStatus(data?.status || '');

    console.log(`🔄 [HeyGen] Status: ${data?.status} → ${status}`);

    return {
      videoId,
      status,
      progress: data?.percent,
      videoUrl: data?.video_url,
      error: data?.error,
    };
  }

  /**
   * Get completed video
   */
  async getVideo(videoId: string): Promise<HeyGenVideoResult> {
    const status = await this.checkStatus(videoId);

    if (status.status !== 'completed') {
      throw new Error(`Video not ready. Status: ${status.status}`);
    }

    if (!status.videoUrl) {
      throw new Error('Video URL not available');
    }

    return {
      videoId,
      videoUrl: status.videoUrl,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Generate and wait for completion
   */
  async generateAndWait(request: HeyGenTalkingPhotoRequest): Promise<HeyGenVideoResult> {
    const generation = await this.generateTalkingPhoto(request);
    const startTime = Date.now();

    console.log(`🎬 [HeyGen] Waiting for video ${generation.videoId}...`);

    while (true) {
      const elapsed = Date.now() - startTime;

      if (elapsed > this.maxWaitTime) {
        throw new Error(`HeyGen video generation timeout after ${this.maxWaitTime}ms`);
      }

      const status = await this.checkStatus(generation.videoId);

      if (status.status === 'completed') {
        console.log(`✅ [HeyGen] Video completed: ${status.videoUrl}`);
        return {
          videoId: generation.videoId,
          videoUrl: status.videoUrl!,
          createdAt: new Date().toISOString(),
        };
      }

      if (status.status === 'failed') {
        throw new Error(`HeyGen video generation failed: ${status.error || 'Unknown error'}`);
      }

      await this.sleep(this.pollInterval);
    }
  }

  /**
   * List available voices
   */
  async listVoices(): Promise<Array<{ voiceId: string; name: string; language: string }>> {
    const response = await this.request('/v2/voices', 'GET');

    if (response.error) {
      const errorData = response.error as { message?: string };
      throw new Error(`Failed to list voices: ${errorData.message || JSON.stringify(response.error)}`);
    }

    const data = response.data as { voices?: Array<Record<string, string>> } | undefined;
    return (data?.voices || []).map((v: Record<string, string>) => ({
      voiceId: v.voice_id,
      name: v.name,
      language: v.language,
    }));
  }

  /**
   * Upload an image and get a URL for HeyGen
   */
  async uploadImage(imageBase64: string): Promise<string> {
    // For base64 images, we need to upload to HeyGen first
    const buffer = Buffer.from(imageBase64, 'base64');

    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: 'image/png' }), 'image.png');

    const response = await fetch(`${this.uploadUrl}/v1/asset`, {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
      },
      body: formData,
    });

    const data = await response.json() as Record<string, unknown>;

    if (data.error) {
      const errorData = data.error as { message?: string };
      throw new Error(`Failed to upload image: ${errorData.message || JSON.stringify(data.error)}`);
    }

    const dataObj = data.data as { url?: string } | undefined;
    return dataObj?.url || (data.url as string);
  }

  /**
   * Upload audio and get a URL for HeyGen
   */
  async uploadAudio(audioBase64: string, mimeType = 'audio/mp3'): Promise<string> {
    const buffer = Buffer.from(audioBase64, 'base64');

    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: mimeType }), 'audio.mp3');

    const response = await fetch(`${this.uploadUrl}/v1/asset`, {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
      },
      body: formData,
    });

    const data = await response.json() as Record<string, unknown>;

    if (data.error) {
      const errorData = data.error as { message?: string };
      throw new Error(`Failed to upload audio: ${errorData.message || JSON.stringify(data.error)}`);
    }

    const dataObj = data.data as { url?: string } | undefined;
    return dataObj?.url || (data.url as string);
  }

  // Private helper methods

  private async request(endpoint: string, method: string, body?: unknown): Promise<Record<string, unknown>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    return await response.json() as Record<string, unknown>;
  }

  private mapStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' {
    switch (status) {
      case 'pending':
      case 'waiting':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'completed':
      case 'success':
        return 'completed';
      case 'failed':
      case 'error':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private getDimension(aspectRatio?: string): { width: number; height: number } {
    switch (aspectRatio) {
      case '16:9':
        return { width: 1920, height: 1080 };
      case '1:1':
        return { width: 1080, height: 1080 };
      case '9:16':
      default:
        return { width: 1080, height: 1920 };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create HeyGen generator
 */
export function createHeyGenGenerator(options?: HeyGenGeneratorOptions): HeyGenGenerator {
  return new HeyGenGenerator(options);
}
