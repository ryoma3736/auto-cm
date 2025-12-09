/**
 * Voice Cloner Module
 * Clone voices using ElevenLabs API and generate TTS
 *
 * Features:
 * - Voice cloning from audio samples
 * - Text-to-speech with cloned voices
 * - Fallback to OpenAI TTS when no sample provided
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import OpenAI from 'openai';
import type { PersonProfile } from '../person-analyzer/index.js';

/**
 * Voice cloning request
 */
export interface VoiceCloningRequest {
  /** Voice sample in Base64 (optional - if not provided, uses default voice) */
  voiceSample?: string;
  /** Person profile for voice matching */
  personProfile?: PersonProfile;
  /** Text to synthesize */
  text: string;
  /** Language code */
  language: 'ja' | 'en' | 'zh';
  /** Target duration in seconds */
  targetDuration?: number;
}

/**
 * Voice cloning result
 */
export interface VoiceCloningResult {
  /** Path to generated audio file */
  audioPath: string;
  /** Audio duration in seconds */
  duration: number;
  /** ElevenLabs voice ID (if cloned) */
  voiceId?: string;
  /** Whether a custom cloned voice was used */
  isCloned: boolean;
  /** Base64 encoded audio */
  audioBase64?: string;
}

/**
 * Configuration options
 */
export interface VoiceClonerOptions {
  /** ElevenLabs API key */
  elevenLabsApiKey?: string;
  /** OpenAI API key (for fallback) */
  openaiApiKey?: string;
  /** ElevenLabs model ID */
  elevenLabsModel?: string;
  /** Use mock implementation */
  useMock?: boolean;
}

/**
 * ElevenLabs voice IDs for different languages/genders
 */
const ELEVENLABS_VOICES = {
  ja: {
    female: 'Xb7hH8MSUJpSbSDYk0k2', // Japanese female
    male: '2EiwWnXFnvU5JabPnv8n',   // Japanese male
  },
  en: {
    female: 'EXAVITQu4vr4xnSDxMaL', // Sarah
    male: 'ErXwobaYiN019PkySvjV',   // Antoni
  },
  zh: {
    female: 'Xb7hH8MSUJpSbSDYk0k2', // Use Japanese female for Chinese
    male: '2EiwWnXFnvU5JabPnv8n',   // Use Japanese male for Chinese
  },
};

/**
 * OpenAI voice mapping
 */
const OPENAI_VOICES: Record<string, 'nova' | 'alloy' | 'echo' | 'fable' | 'onyx' | 'shimmer'> = {
  female: 'nova',
  male: 'onyx',
};

/**
 * VoiceCloner class
 */
export class VoiceCloner {
  private elevenLabsApiKey?: string;
  private openai?: OpenAI;
  private elevenLabsModel: string;
  private useMock: boolean;

  constructor(options: VoiceClonerOptions = {}) {
    this.elevenLabsApiKey = options.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
    this.elevenLabsModel = options.elevenLabsModel || 'eleven_multilingual_v2';
    this.useMock = options.useMock ?? false;

    const openaiKey = options.openaiApiKey || process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }

    if (!this.elevenLabsApiKey && !this.openai && !this.useMock) {
      console.warn('⚠️ [VoiceCloner] No API keys provided. Using mock mode.');
      this.useMock = true;
    }
  }

  /**
   * Clone voice from sample and generate speech
   */
  async cloneAndSpeak(request: VoiceCloningRequest): Promise<VoiceCloningResult> {
    if (this.useMock) {
      return this.mockCloneAndSpeak(request);
    }

    // If voice sample provided and ElevenLabs available, use voice cloning
    if (request.voiceSample && this.elevenLabsApiKey) {
      try {
        return await this.cloneVoiceAndSpeak(request);
      } catch (error) {
        console.warn('⚠️ [VoiceCloner] Voice cloning failed, falling back:', error);
        // Fallback to preset voice
      }
    }

    // Use preset ElevenLabs voice if available
    if (this.elevenLabsApiKey) {
      return await this.speakWithPresetVoice(request);
    }

    // Fallback to OpenAI TTS
    if (this.openai) {
      return await this.speakWithOpenAI(request);
    }

    throw new Error('No voice synthesis API available');
  }

  /**
   * Clone voice from sample and generate speech
   */
  private async cloneVoiceAndSpeak(request: VoiceCloningRequest): Promise<VoiceCloningResult> {
    console.log('🎤 [VoiceCloner] Cloning voice from sample...');

    if (!this.elevenLabsApiKey) {
      throw new Error('ElevenLabs API key required for voice cloning');
    }

    // Step 1: Create cloned voice
    const voiceId = await this.createClonedVoice(request.voiceSample!, request.personProfile);

    // Step 2: Generate speech with cloned voice
    const result = await this.generateSpeechWithVoice(voiceId, request);

    return {
      ...result,
      voiceId,
      isCloned: true,
    };
  }

  /**
   * Create a cloned voice from audio sample
   */
  private async createClonedVoice(
    voiceSampleBase64: string,
    personProfile?: PersonProfile
  ): Promise<string> {
    // Save sample to temp file
    const tempDir = os.tmpdir();
    const samplePath = path.join(tempDir, `voice-sample-${Date.now()}.mp3`);
    fs.writeFileSync(samplePath, Buffer.from(voiceSampleBase64, 'base64'));

    const formData = new FormData();
    formData.append('name', personProfile?.suggestedPersonaName || `Clone-${Date.now()}`);
    formData.append('description', 'Auto-CM voice clone');
    formData.append('files', new Blob([fs.readFileSync(samplePath)]), 'sample.mp3');

    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': this.elevenLabsApiKey!,
      },
      body: formData,
    });

    // Clean up temp file
    fs.unlinkSync(samplePath);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Voice cloning failed: ${error}`);
    }

    const result = await response.json() as { voice_id: string };
    console.log(`✅ [VoiceCloner] Voice cloned: ${result.voice_id}`);

    return result.voice_id;
  }

  /**
   * Generate speech using ElevenLabs voice
   */
  private async generateSpeechWithVoice(
    voiceId: string,
    request: VoiceCloningRequest
  ): Promise<VoiceCloningResult> {
    console.log(`🎤 [VoiceCloner] Generating speech with voice: ${voiceId}`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.elevenLabsApiKey!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: request.text,
          model_id: this.elevenLabsModel,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Speech generation failed: ${error}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const tempDir = os.tmpdir();
    const audioPath = path.join(tempDir, `voice-${Date.now()}.mp3`);
    fs.writeFileSync(audioPath, audioBuffer);

    const duration = this.getAudioDuration(audioPath);

    console.log(`✅ [VoiceCloner] Generated ${duration.toFixed(1)}s audio`);

    return {
      audioPath,
      duration,
      voiceId,
      isCloned: false,
      audioBase64: audioBuffer.toString('base64'),
    };
  }

  /**
   * Speak with preset ElevenLabs voice
   */
  private async speakWithPresetVoice(request: VoiceCloningRequest): Promise<VoiceCloningResult> {
    const gender = request.personProfile?.gender === 'male' ? 'male' : 'female';
    const voiceId = ELEVENLABS_VOICES[request.language]?.[gender]
      || ELEVENLABS_VOICES.en[gender];

    console.log(`🎤 [VoiceCloner] Using preset voice: ${voiceId} (${gender})`);

    return await this.generateSpeechWithVoice(voiceId, request);
  }

  /**
   * Fallback to OpenAI TTS
   */
  private async speakWithOpenAI(request: VoiceCloningRequest): Promise<VoiceCloningResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    console.log('🎤 [VoiceCloner] Falling back to OpenAI TTS...');

    const gender = request.personProfile?.gender === 'male' ? 'male' : 'female';
    const voice = request.personProfile?.voiceCharacteristics?.recommendedVoice
      || OPENAI_VOICES[gender];

    const speed = this.calculateSpeed(request.text, request.targetDuration);

    const response = await this.openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: request.text,
      response_format: 'mp3',
      speed,
    });

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const tempDir = os.tmpdir();
    const audioPath = path.join(tempDir, `voice-openai-${Date.now()}.mp3`);
    fs.writeFileSync(audioPath, audioBuffer);

    const duration = this.getAudioDuration(audioPath);

    console.log(`✅ [VoiceCloner] OpenAI TTS generated: ${duration.toFixed(1)}s`);

    return {
      audioPath,
      duration,
      isCloned: false,
      audioBase64: audioBuffer.toString('base64'),
    };
  }

  /**
   * Generate for multiple scenes
   */
  async generateForScenes(
    scenes: Array<{ narration: string; durationSeconds: number }>,
    language: 'ja' | 'en' | 'zh',
    personProfile?: PersonProfile,
    voiceSample?: string
  ): Promise<VoiceCloningResult> {
    const fullNarration = scenes.map(s => s.narration).join('。');
    const totalDuration = scenes.reduce((sum, s) => sum + s.durationSeconds, 0);

    return this.cloneAndSpeak({
      voiceSample,
      personProfile,
      text: fullNarration,
      language,
      targetDuration: totalDuration,
    });
  }

  /**
   * Merge audio with video
   */
  async mergeAudioWithVideo(
    videoPath: string,
    audioPath: string,
    outputPath?: string
  ): Promise<string> {
    const finalOutputPath = outputPath || path.join(
      os.tmpdir(),
      `merged-${Date.now()}.mp4`
    );

    console.log('🎬 [VoiceCloner] Merging audio with video...');

    let localVideoPath = videoPath;
    if (videoPath.startsWith('http')) {
      localVideoPath = path.join(os.tmpdir(), `video-${Date.now()}.mp4`);
      execSync(`curl -sL "${videoPath}" -o "${localVideoPath}"`, { timeout: 60000 });
    }

    const ffmpegCmd = `ffmpeg -y -i "${localVideoPath}" -i "${audioPath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${finalOutputPath}" 2>/dev/null`;
    execSync(ffmpegCmd, { timeout: 120000 });

    if (videoPath.startsWith('http') && localVideoPath !== videoPath) {
      fs.unlinkSync(localVideoPath);
    }

    console.log(`✅ [VoiceCloner] Merged video saved: ${finalOutputPath}`);
    return finalOutputPath;
  }

  /**
   * Calculate speech speed
   */
  private calculateSpeed(text: string, targetDuration?: number): number {
    if (!targetDuration) return 1.0;

    const charsPerSecond = 2.5;
    const estimatedDuration = text.length / charsPerSecond;
    let speed = estimatedDuration / targetDuration;

    return Math.max(0.25, Math.min(4.0, speed));
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
      return 0;
    }
  }

  /**
   * Mock implementation
   */
  private mockCloneAndSpeak(request: VoiceCloningRequest): VoiceCloningResult {
    console.log('🎤 [VoiceCloner] MOCK: Generating voice');

    const tempDir = os.tmpdir();
    const audioPath = path.join(tempDir, `mock-voice-${Date.now()}.mp3`);
    fs.writeFileSync(audioPath, Buffer.alloc(0));

    return {
      audioPath,
      duration: request.targetDuration || 12,
      isCloned: !!request.voiceSample,
      voiceId: request.voiceSample ? 'mock-cloned-voice-id' : undefined,
    };
  }

  /**
   * Delete a cloned voice
   */
  async deleteClonedVoice(voiceId: string): Promise<void> {
    if (!this.elevenLabsApiKey) return;

    try {
      await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
        method: 'DELETE',
        headers: {
          'xi-api-key': this.elevenLabsApiKey,
        },
      });
      console.log(`🗑️ [VoiceCloner] Deleted voice: ${voiceId}`);
    } catch (error) {
      console.warn(`⚠️ [VoiceCloner] Failed to delete voice ${voiceId}:`, error);
    }
  }
}

/**
 * Factory function
 */
export function createVoiceCloner(options?: VoiceClonerOptions): VoiceCloner {
  return new VoiceCloner(options);
}
