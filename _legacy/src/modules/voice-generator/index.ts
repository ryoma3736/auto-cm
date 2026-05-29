/**
 * Voice Generator Module
 * Generates voice narration using OpenAI TTS API
 *
 * Supports multiple languages:
 * - Japanese (ja): Natural Japanese female voice
 * - English (en): Natural English female voice
 * - Chinese (zh): Natural Chinese female voice
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

/**
 * Voice generation request
 */
export interface VoiceRequest {
  /** Text to convert to speech */
  text: string;
  /** Language code (ja, en, zh) */
  language: 'ja' | 'en' | 'zh';
  /** Target duration in seconds (will adjust speed) */
  targetDuration?: number;
}

/**
 * Voice generation result
 */
export interface VoiceResult {
  /** Path to the generated audio file */
  audioPath: string;
  /** Audio duration in seconds */
  duration: number;
  /** Base64 encoded audio data */
  audioBase64?: string;
}

/**
 * Video with audio merge request
 */
export interface MergeRequest {
  /** Path or URL to the video file */
  videoPath: string;
  /** Path to the audio file */
  audioPath: string;
  /** Output path for the merged video */
  outputPath?: string;
}

/**
 * Configuration options
 */
export interface VoiceGeneratorOptions {
  /** OpenAI API key */
  apiKey?: string;
  /** Voice model to use (default: tts-1) */
  model?: 'tts-1' | 'tts-1-hd';
  /** Use mock implementation */
  useMock?: boolean;
}

/**
 * Voice selection based on language
 * Using female voices for UGC-style content
 */
const VOICE_MAP: Record<'ja' | 'en' | 'zh', 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'> = {
  ja: 'nova',    // Natural female voice, good for Japanese
  en: 'nova',    // Natural female voice for English
  zh: 'nova',    // Works well for Chinese too
};

/**
 * VoiceGenerator class
 * Handles text-to-speech conversion using OpenAI TTS
 */
export class VoiceGenerator {
  private openai?: OpenAI;
  private model: 'tts-1' | 'tts-1-hd';
  private useMock: boolean;

  constructor(options: VoiceGeneratorOptions = {}) {
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    this.model = options.model || 'tts-1';
    this.useMock = options.useMock ?? !apiKey;

    if (apiKey && !this.useMock) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Generate voice narration from text
   */
  async generate(request: VoiceRequest): Promise<VoiceResult> {
    if (this.useMock) {
      return this.generateMock(request);
    }

    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Set OPENAI_API_KEY.');
    }

    const voice = VOICE_MAP[request.language];

    console.log(`🎤 [VoiceGenerator] Generating ${request.language} voice...`);
    console.log(`   Text length: ${request.text.length} chars`);
    console.log(`   Voice: ${voice}, Model: ${this.model}`);

    try {
      // Generate speech
      const response = await this.openai.audio.speech.create({
        model: this.model,
        voice: voice,
        input: request.text,
        response_format: 'mp3',
        speed: this.calculateSpeed(request.text, request.targetDuration),
      });

      // Save to temp file
      const tempDir = os.tmpdir();
      const audioPath = path.join(tempDir, `voice-${Date.now()}.mp3`);

      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(audioPath, buffer);

      // Get audio duration using ffprobe
      const duration = this.getAudioDuration(audioPath);

      console.log(`✅ [VoiceGenerator] Generated audio: ${duration.toFixed(1)}s`);

      return {
        audioPath,
        duration,
        audioBase64: buffer.toString('base64'),
      };
    } catch (error) {
      console.error('❌ [VoiceGenerator] Error:', error);
      throw new Error(`Voice generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate voice for all scenes and concatenate
   */
  async generateForScenes(
    scenes: Array<{ narration: string; durationSeconds: number }>,
    language: 'ja' | 'en' | 'zh'
  ): Promise<VoiceResult> {
    if (this.useMock) {
      const fullText = scenes.map(s => s.narration).join(' ');
      return this.generateMock({ text: fullText, language });
    }

    console.log(`🎤 [VoiceGenerator] Generating voice for ${scenes.length} scenes...`);

    // Combine all narrations with appropriate pauses
    const fullNarration = scenes.map(scene => scene.narration).join('。');
    const totalDuration = scenes.reduce((sum, s) => sum + s.durationSeconds, 0);

    return this.generate({
      text: fullNarration,
      language,
      targetDuration: totalDuration,
    });
  }

  /**
   * Merge audio with video using ffmpeg
   */
  async mergeAudioWithVideo(request: MergeRequest): Promise<string> {
    const { videoPath, audioPath, outputPath } = request;

    // Determine output path
    const finalOutputPath = outputPath || path.join(
      os.tmpdir(),
      `merged-${Date.now()}.mp4`
    );

    console.log(`🎬 [VoiceGenerator] Merging audio with video...`);
    console.log(`   Video: ${videoPath}`);
    console.log(`   Audio: ${audioPath}`);

    try {
      // Check if video is a URL, download if needed
      let localVideoPath = videoPath;
      if (videoPath.startsWith('http')) {
        localVideoPath = path.join(os.tmpdir(), `video-${Date.now()}.mp4`);
        console.log(`   Downloading video...`);
        execSync(`curl -sL "${videoPath}" -o "${localVideoPath}"`, { timeout: 60000 });
      }

      // Use ffmpeg to merge audio and video
      // -shortest ensures the output matches the shorter of the two
      const ffmpegCmd = `ffmpeg -y -i "${localVideoPath}" -i "${audioPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${finalOutputPath}" 2>/dev/null`;

      execSync(ffmpegCmd, { timeout: 120000 });

      console.log(`✅ [VoiceGenerator] Merged video saved: ${finalOutputPath}`);

      // Clean up downloaded video if it was a URL
      if (videoPath.startsWith('http') && localVideoPath !== videoPath) {
        fs.unlinkSync(localVideoPath);
      }

      return finalOutputPath;
    } catch (error) {
      console.error('❌ [VoiceGenerator] Merge error:', error);
      throw new Error(`Failed to merge audio with video: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Calculate speech speed to match target duration
   * OpenAI TTS speed range: 0.25 to 4.0
   */
  private calculateSpeed(text: string, targetDuration?: number): number {
    if (!targetDuration) return 1.0;

    // Estimate base duration (roughly 150 chars per minute for Japanese)
    const charsPerSecond = 2.5; // Approximate for Japanese
    const estimatedDuration = text.length / charsPerSecond;

    // Calculate required speed
    let speed = estimatedDuration / targetDuration;

    // Clamp to valid range
    speed = Math.max(0.25, Math.min(4.0, speed));

    console.log(`   Speed adjustment: ${speed.toFixed(2)}x (est: ${estimatedDuration.toFixed(1)}s -> target: ${targetDuration}s)`);

    return speed;
  }

  /**
   * Get audio duration using ffprobe
   */
  private getAudioDuration(audioPath: string): number {
    try {
      const result = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
        { encoding: 'utf-8' }
      );
      return parseFloat(result.trim()) || 0;
    } catch {
      console.warn('⚠️ Could not determine audio duration');
      return 0;
    }
  }

  /**
   * Mock implementation for testing
   */
  private generateMock(request: VoiceRequest): VoiceResult {
    console.log(`🎤 [VoiceGenerator] MOCK: Generating ${request.language} voice`);

    const tempDir = os.tmpdir();
    const audioPath = path.join(tempDir, `mock-voice-${Date.now()}.mp3`);

    // Create empty file
    fs.writeFileSync(audioPath, Buffer.alloc(0));

    return {
      audioPath,
      duration: request.targetDuration || 12,
    };
  }
}

/**
 * Factory function
 */
export function createVoiceGenerator(options?: VoiceGeneratorOptions): VoiceGenerator {
  return new VoiceGenerator(options);
}
