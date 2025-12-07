/**
 * Pipeline Module
 * Orchestrates the entire ad generation workflow
 *
 * Flow:
 * 1. Image input & validation (ImageInputModule)
 * 2. Base64 conversion (ImageInputModule.toBase64)
 * 3. Vision API analysis (VisionAnalyzer.analyze)
 * 4. Persona & script generation (ScriptGenerator.generateFullScript)
 * 5. NanoBanana vertical extension (ImageProcessor.extendToVertical)
 * 6. 720x1280 resize (ImageProcessor.resizeTo720x1280)
 * 7. Sora2 video generation (VideoGenerator.generateAndWait)
 * 8. Google Drive storage (DriveStorage.upload)
 * 9. Result return
 */

import {
  ImageInputModule,
  VisionAnalyzer,
  type ProductAnalysis,
} from '../modules/image-analyzer/index.js';
import {
  ScriptGenerator,
  type Persona,
  type UGCScript,
} from '../modules/script-generator/index.js';
import { ImageProcessor } from '../modules/image-processor/index.js';
import { VideoGenerator, generatePersonPrompt, mergeWithScriptPrompt } from '../modules/video-generator/index.js';
import { VoiceGenerator } from '../modules/voice-generator/index.js';
import { DriveStorage, type VideoFile } from '../modules/storage/index.js';
// V2 imports
import { PersonAnalyzer, type PersonProfile } from '../modules/person-analyzer/index.js';
import { VoiceCloner } from '../modules/voice-cloner/index.js';

// ========== Pipeline Interfaces ==========

export interface PipelineInput {
  /** Local file path to product image */
  imagePath?: string;
  /** URL to product image */
  imageUrl?: string;
  /** Base64-encoded image (with or without data URI prefix) */
  imageBase64?: string;
  /** Google Drive folder ID for upload */
  outputFolderId?: string;
  /** Make uploaded video publicly accessible */
  makePublic?: boolean;
  // V2: Person-based CM generation
  /** Person image in Base64 (V2 feature) */
  personImageBase64?: string;
  /** Voice sample in Base64 for cloning (V2 feature) */
  voiceSampleBase64?: string;
}

export interface PipelineResult {
  /** Pipeline execution success status */
  success: boolean;
  /** Generated video URL (if successful) */
  videoUrl?: string;
  /** Google Drive link (if uploaded) */
  driveLink?: string;
  /** Detailed metadata about the generation process */
  metadata: {
    productAnalysis: ProductAnalysis;
    persona: Persona;
    script: UGCScript;
    processingTime: number;
    stages: StageResult[];
    // V2: Person profile
    personProfile?: PersonProfile;
    isVoiceCloned?: boolean;
  };
  /** Error message (if failed) */
  error?: string;
}

export interface StageResult {
  /** Stage name */
  name: string;
  /** Execution status */
  status: 'success' | 'failed' | 'skipped';
  /** Execution duration in milliseconds */
  duration: number;
  /** Error message (if failed) */
  error?: string;
}

export interface PipelineOptions {
  /** OpenAI API key (for Vision + Script generation) */
  openaiApiKey?: string;
  /** Google Drive credentials (object or path) */
  googleDriveCredentials?: object;
  googleDriveCredentialsPath?: string;
  /** Use mock implementations for ALL modules (for testing) */
  useMock?: boolean;
  /** Mock only video generation (Sora API not public yet) - uses real Vision/GPT-4 */
  mockVideoOnly?: boolean;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Video duration in seconds (4, 8, or 12) */
  duration?: number;
  /** Script language (ja, en, zh) */
  language?: 'ja' | 'en' | 'zh';
  // V2 options
  /** ElevenLabs API key for voice cloning */
  elevenLabsApiKey?: string;
}

// ========== Main Pipeline Class ==========

/**
 * AdGenerationPipeline - Complete automation for UGC ad generation
 *
 * This class orchestrates all stages of the ad creation process:
 * - Image analysis with AI vision
 * - Script generation with persona
 * - Image processing for video format
 * - Video generation with Sora2
 * - Cloud storage upload
 */
export class AdGenerationPipeline {
  private imageInput: ImageInputModule;
  private visionAnalyzer: VisionAnalyzer;
  private scriptGenerator: ScriptGenerator;
  private imageProcessor: ImageProcessor;
  private videoGenerator: VideoGenerator;
  private voiceGenerator: VoiceGenerator;
  private driveStorage: DriveStorage | null = null;
  private options: PipelineOptions;
  // V2 modules
  private personAnalyzer: PersonAnalyzer;
  private voiceCloner: VoiceCloner;

  constructor(options: PipelineOptions = {}) {
    this.options = {
      useMock: false,
      verbose: false,
      ...options,
    };

    // Initialize modules
    this.imageInput = new ImageInputModule();

    this.visionAnalyzer = new VisionAnalyzer({
      openaiApiKey: options.openaiApiKey || process.env.OPENAI_API_KEY,
      useMock: options.useMock,
    });

    this.scriptGenerator = new ScriptGenerator({
      apiKey: options.openaiApiKey || process.env.OPENAI_API_KEY,
      useMock: options.useMock,
      language: options.language || 'ja',
    });

    this.imageProcessor = new ImageProcessor({
      nanoBananaApiKey: process.env.NANOBANANA_API_KEY || '',
      nanoBananaEndpoint: process.env.NANOBANANA_ENDPOINT || '',
    });

    // Use mock for video if mockVideoOnly is true OR if useMock is true for all modules
    this.videoGenerator = new VideoGenerator({
      replicateApiToken: process.env.REPLICATE_API_TOKEN,
      openaiApiKey: process.env.OPENAI_API_KEY, // For direct billing via Replicate
      useMock: options.mockVideoOnly || options.useMock,
    });

    // Initialize VoiceGenerator for TTS narration
    this.voiceGenerator = new VoiceGenerator({
      apiKey: options.openaiApiKey || process.env.OPENAI_API_KEY,
      model: 'tts-1',
      useMock: options.useMock,
    });

    // Initialize DriveStorage if credentials are provided
    if (options.googleDriveCredentials || options.googleDriveCredentialsPath) {
      this.driveStorage = new DriveStorage({
        credentials: options.googleDriveCredentials,
        credentialsPath: options.googleDriveCredentialsPath,
        useMock: options.useMock,
      });
    }

    // V2: Initialize PersonAnalyzer and VoiceCloner
    this.personAnalyzer = new PersonAnalyzer({
      geminiApiKey: process.env.GEMINI_API_KEY,
      useMock: options.useMock,
    });

    this.voiceCloner = new VoiceCloner({
      elevenLabsApiKey: options.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY,
      openaiApiKey: options.openaiApiKey || process.env.OPENAI_API_KEY,
      useMock: options.useMock,
    });
  }

  /**
   * Execute the complete ad generation pipeline
   *
   * @param input - Pipeline input (image path, URL, or base64)
   * @returns Complete pipeline result with metadata
   */
  async generate(input: PipelineInput): Promise<PipelineResult> {
    const startTime = Date.now();
    const stages: StageResult[] = [];

    let productAnalysis: ProductAnalysis | null = null;
    let persona: Persona | null = null;
    let script: UGCScript | null = null;
    let videoUrl: string | undefined;
    let driveLink: string | undefined;
    // V2: Track person profile and voice cloning status
    let personProfile: PersonProfile | undefined;
    let isVoiceCloned = false;

    try {
      // ============================================================
      // Stage 1: Image Input & Validation
      // ============================================================
      const stage1 = await this.executeStage('Image Input & Validation', async () => {
        this.log('Loading and validating image...');

        let imageBase64: string;

        if (input.imageBase64) {
          // Remove data URI prefix if present
          imageBase64 = input.imageBase64.replace(/^data:image\/\w+;base64,/, '');
          this.log('Using provided base64 image');
        } else if (input.imagePath) {
          const imageData = await this.imageInput.loadAndValidate(input.imagePath);
          imageBase64 = this.imageInput.toBase64(imageData);
          this.log(`Loaded image from path: ${input.imagePath}`);
        } else if (input.imageUrl) {
          const imageData = await this.imageInput.loadAndValidate(input.imageUrl);
          imageBase64 = this.imageInput.toBase64(imageData);
          this.log(`Loaded image from URL: ${input.imageUrl}`);
        } else {
          throw new Error('No image input provided (imagePath, imageUrl, or imageBase64 required)');
        }

        return { imageBase64 };
      });
      stages.push(stage1.stage);

      if (!stage1.result) {
        throw new Error('Stage 1 failed: No image data');
      }

      const { imageBase64 } = stage1.result;

      // ============================================================
      // Stage 2: Vision API Analysis
      // ============================================================
      const stage2 = await this.executeStage('Vision API Analysis', async () => {
        this.log('Analyzing product image with AI vision...');
        const analysis = await this.visionAnalyzer.analyze(imageBase64);
        this.log(`Product type: ${analysis.productType}, Name: ${analysis.productName}`);
        return { analysis };
      });
      stages.push(stage2.stage);

      if (!stage2.result) {
        throw new Error('Stage 2 failed: No vision analysis');
      }

      productAnalysis = stage2.result.analysis;

      // ============================================================
      // Stage 2.5: Person Analysis (V2 - Optional)
      // ============================================================
      if (input.personImageBase64) {
        const stage2_5 = await this.executeStage('Person Analysis (V2)', async () => {
          this.log('Analyzing person image with Gemini Vision...');
          const profile = await this.personAnalyzer.analyze({
            personImage: input.personImageBase64!,
            language: this.options.language || 'ja',
          });
          this.log(`Person: ${profile.suggestedPersonaName}, ${profile.estimatedAge}歳, ${profile.gender}`);
          this.log(`Voice recommendation: ${profile.voiceCharacteristics.recommendedVoice}`);
          return { profile };
        });
        stages.push(stage2_5.stage);

        if (stage2_5.result) {
          personProfile = stage2_5.result.profile;
        }
      }

      // ============================================================
      // Stage 3: Persona & Script Generation
      // ============================================================
      const stage3 = await this.executeStage('Persona & Script Generation', async () => {
        this.log('Generating target persona and UGC script...');
        this.log(`Language setting: ${this.options.language || 'ja'}`);
        const { persona: generatedPersona, script: generatedScript } =
          await this.scriptGenerator.generateFullScript(productAnalysis!);
        this.log(`Persona: ${generatedPersona.name}, ${generatedPersona.age} years old`);
        this.log(`Script scenes: ${generatedScript.scenes.length}`);
        // Log first scene narration for debugging
        if (generatedScript.scenes.length > 0) {
          this.log(`Scene 1 narration: ${generatedScript.scenes[0].narration}`);
        }
        return { persona: generatedPersona, script: generatedScript };
      });
      stages.push(stage3.stage);

      if (!stage3.result) {
        throw new Error('Stage 3 failed: No persona/script');
      }

      persona = stage3.result.persona;
      script = stage3.result.script;

      // ============================================================
      // Stage 4: Image Extension to Vertical (9:16)
      // ============================================================
      const stage4 = await this.executeStage('Image Extension to Vertical', async () => {
        this.log('Extending image to 9:16 aspect ratio...');
        const extended = await this.imageProcessor.extendToVertical(imageBase64, {
          targetAspectRatio: '9:16',
          backgroundColor: '#FFFFFF',
          preserveOriginal: true,
        });
        this.log(`Extended to ${extended.width}x${extended.height}`);
        return { extendedBase64: extended.base64 };
      });
      stages.push(stage4.stage);

      if (!stage4.result) {
        throw new Error('Stage 4 failed: Image extension failed');
      }

      const { extendedBase64 } = stage4.result;

      // ============================================================
      // Stage 5: Resize to 720x1280 (Sora2 format)
      // ============================================================
      const stage5 = await this.executeStage('Resize to 720x1280', async () => {
        this.log('Resizing to Sora2-compatible dimensions (720x1280)...');
        const resized = await this.imageProcessor.resizeTo720x1280(extendedBase64);
        this.log(`Resized: ${resized.width}x${resized.height}, ${resized.format}`);
        return { resizedBase64: resized.base64 };
      });
      stages.push(stage5.stage);

      if (!stage5.result) {
        throw new Error('Stage 5 failed: Image resize failed');
      }

      const { resizedBase64 } = stage5.result;

      // ============================================================
      // Stage 6: Sora2 Video Generation (V2: Person-enhanced prompt)
      // ============================================================
      const stage6 = await this.executeStage('Sora2 Video Generation', async () => {
        this.log('Generating video with Sora2...');

        // V2: Generate person-enhanced prompt if person profile is available
        let finalPrompt = script!.sora2Prompt;

        if (personProfile && productAnalysis) {
          this.log('V2 Mode: Generating person-enhanced prompt...');
          const personPromptResult = generatePersonPrompt({
            personProfile,
            productAnalysis,
            script: script!,
            duration: this.options.duration || 12,
            language: this.options.language || 'ja',
          });

          finalPrompt = mergeWithScriptPrompt(personPromptResult, script!.sora2Prompt);
          this.log(`Person-enhanced prompt generated (${finalPrompt.length} chars)`);
        }

        this.log(`Prompt length: ${finalPrompt?.length || 0} chars`);

        // Validate prompt
        if (!finalPrompt || finalPrompt.trim() === '') {
          console.error('❌ [Pipeline] ERROR: sora2Prompt is empty!');
          console.error('❌ [Pipeline] Script object:', JSON.stringify(script, null, 2));
          throw new Error('Script generation failed: Empty sora2Prompt');
        }

        this.log(`Prompt preview: ${finalPrompt.substring(0, 100)}...`);

        const videoResult = await this.videoGenerator.generateAndWait({
          firstFrameImage: resizedBase64,
          prompt: finalPrompt,
          duration: this.options.duration || 12,
          aspectRatio: '9:16',
        });

        this.log(`Video generated: ${videoResult.videoUrl}`);
        return { videoResult };
      });
      stages.push(stage6.stage);

      if (!stage6.result) {
        const errorDetail = stage6.stage.error || 'Unknown error';
        console.error('❌ [Pipeline] Stage 6 failed with error:', errorDetail);
        throw new Error(`Stage 6 failed: ${errorDetail}`);
      }

      videoUrl = stage6.result.videoResult.videoUrl;

      // ============================================================
      // Stage 7: Voice Generation & Audio Merge (V1/V2 hybrid)
      // ============================================================
      const stage7 = await this.executeStage('Voice Generation & Merge', async () => {
        const language = this.options.language || 'ja';
        this.log(`Generating ${language} voice narration...`);

        let voiceResult;
        let cloned = false;

        // V2: Use VoiceCloner if person profile or voice sample is available
        if (personProfile || input.voiceSampleBase64) {
          this.log('V2 Mode: Using VoiceCloner...');
          voiceResult = await this.voiceCloner.generateForScenes(
            script!.scenes,
            language,
            personProfile,
            input.voiceSampleBase64
          );
          cloned = !!input.voiceSampleBase64;
          this.log(`Voice ${cloned ? 'cloned' : 'generated'}: ${voiceResult.duration.toFixed(1)}s`);
        } else {
          // V1: Use standard VoiceGenerator
          voiceResult = await this.voiceGenerator.generateForScenes(
            script!.scenes,
            language
          );
          this.log(`Voice generated: ${voiceResult.duration.toFixed(1)}s`);
        }

        // Merge audio with video
        this.log('Merging audio with video...');
        const mergedVideoPath = await this.voiceCloner.mergeAudioWithVideo(
          videoUrl!,
          voiceResult.audioPath
        );

        this.log(`Video with voice created: ${mergedVideoPath}`);
        return { mergedVideoPath, voiceDuration: voiceResult.duration, isCloned: cloned };
      });
      stages.push(stage7.stage);

      // Update videoUrl to point to merged video if successful
      if (stage7.result) {
        // For local file, we need to serve it or return the path
        // For now, keep original URL but note that merged video is available locally
        this.log(`Merged video available at: ${stage7.result.mergedVideoPath}`);
        isVoiceCloned = stage7.result.isCloned;
      }

      // ============================================================
      // Stage 8: Google Drive Upload (Optional)
      // ============================================================
      if (this.driveStorage) {
        const stage8 = await this.executeStage('Google Drive Upload', async () => {
          this.log('Uploading to Google Drive...');

          if (!this.driveStorage) {
            throw new Error('DriveStorage not initialized');
          }

          // Authenticate if not already done
          await this.driveStorage.authenticate();

          // Create monthly folder if requested
          const folderId = input.outputFolderId || await this.driveStorage.createMonthlyFolder();

          // Generate filename
          const filename = DriveStorage.generateFilename(productAnalysis!.productType);

          // For mock mode, create a fake video buffer
          const videoBuffer = this.options.useMock
            ? Buffer.from('mock-video-data')
            : Buffer.from(await this.fetchVideoBuffer(videoUrl!));

          const videoFile: VideoFile = {
            buffer: videoBuffer,
            filename,
            mimeType: 'video/mp4',
          };

          const uploadResult = await this.driveStorage.upload(videoFile, {
            folderId,
            makePublic: input.makePublic ?? true,
            description: `Auto-generated UGC ad for ${productAnalysis!.productName}`,
          });

          this.log(`Uploaded to Drive: ${uploadResult.webViewLink}`);
          return { driveFile: uploadResult };
        });
        stages.push(stage8.stage);

        if (stage8.result) {
          driveLink = stage8.result.driveFile.webViewLink;
        }
      } else {
        stages.push({
          name: 'Google Drive Upload',
          status: 'skipped',
          duration: 0,
        });
        this.log('Google Drive upload skipped (no credentials provided)');
      }

      // ============================================================
      // Success - Return Complete Result
      // ============================================================
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        videoUrl,
        driveLink,
        metadata: {
          productAnalysis: productAnalysis!,
          persona: persona!,
          script: script!,
          processingTime,
          stages,
          // V2 metadata
          personProfile,
          isVoiceCloned,
        },
      };
    } catch (error) {
      // ============================================================
      // Error Handling - Partial Result
      // ============================================================
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.log(`Pipeline failed: ${errorMessage}`, 'error');

      return {
        success: false,
        error: errorMessage,
        metadata: {
          productAnalysis: productAnalysis || {
            productType: 'other',
            productName: 'Unknown',
            colors: [],
            features: [],
            targetAudience: 'Unknown',
            mood: [],
            brandStyle: 'Unknown',
            rawDescription: '',
          },
          persona: persona || {
            name: 'Unknown',
            age: 0,
            occupation: 'Unknown',
            personality: [],
            speakingStyle: 'Unknown',
            painPoints: [],
            lifestyle: 'Unknown',
          },
          script: script || {
            totalDuration: 12,
            scenes: [],
            sora2Prompt: '',
          },
          processingTime,
          stages,
        },
      };
    }
  }

  /**
   * Execute a single pipeline stage with timing and error handling
   */
  private async executeStage<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ stage: StageResult; result: T | null }> {
    const startTime = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      return {
        stage: {
          name,
          status: 'success',
          duration,
        },
        result,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        stage: {
          name,
          status: 'failed',
          duration,
          error: errorMessage,
        },
        result: null,
      };
    }
  }

  /**
   * Fetch video buffer from URL (for real API mode)
   */
  private async fetchVideoBuffer(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
    }
    return await response.arrayBuffer();
  }

  /**
   * Log helper with optional verbose mode
   */
  private log(message: string, level: 'info' | 'error' = 'info'): void {
    if (!this.options.verbose && level !== 'error') {
      return;
    }

    const prefix = level === 'error' ? '❌' : '📋';
    console.log(`${prefix} [Pipeline] ${message}`);
  }
}

/**
 * Factory function to create pipeline instance
 */
export function createPipeline(options?: PipelineOptions): AdGenerationPipeline {
  return new AdGenerationPipeline(options);
}

// ========== Legacy Exports for Backward Compatibility ==========

export type { Config } from '../config/default.js';
export { ImageAnalyzer } from '../modules/image-analyzer/index.js';
export { ScriptGenerator } from '../modules/script-generator/index.js';
export { ImageProcessor } from '../modules/image-processor/index.js';
export { VideoGenerator } from '../modules/video-generator/index.js';
export { Storage } from '../modules/storage/index.js';

/**
 * Legacy MovieCreationPipeline (deprecated - use AdGenerationPipeline)
 */
export class MovieCreationPipeline {
  constructor(_options: { config: any }) {
    console.warn('MovieCreationPipeline is deprecated. Use AdGenerationPipeline instead.');
  }

  async execute(_inputImages: string[]): Promise<any> {
    throw new Error('MovieCreationPipeline.execute() is deprecated. Use AdGenerationPipeline.generate() instead.');
  }
}
