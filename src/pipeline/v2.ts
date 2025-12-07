/**
 * Pipeline V2 - Unified Video Generation
 *
 * Features:
 * - Dual engine support: Kling (motion) + HeyGen (lip-sync)
 * - Parallel generation for comparison
 * - Smart engine recommendation
 * - Improved Japanese voice support
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
import { AICompositor } from '../modules/image-processor/ai-composite.js';
import { VideoGenerator } from '../modules/video-generator/index.js';
import { HeyGenGenerator } from '../modules/video-generator/heygen.js';
import { SeedanceGenerator } from '../modules/video-generator/seedance.js';
import { Veo3Generator } from '../modules/video-generator/veo3.js';
import { Sora2Generator } from '../modules/video-generator/sora2.js';
import { VoiceGenerator } from '../modules/voice-generator/index.js';
import { PersonAnalyzer, type PersonProfile } from '../modules/person-analyzer/index.js';
import { VoiceCloner } from '../modules/voice-cloner/index.js';

// ========== V2 Types ==========

export type VideoEngine = 'kling' | 'heygen' | 'seedance' | 'veo3' | 'sora2' | 'all' | 'both';

export interface PipelineV2Input {
  /** Product image (path, URL, or base64) */
  imagePath?: string;
  imageUrl?: string;
  imageBase64?: string;

  /** Person image for presenter mode */
  personImageBase64?: string;

  /** Voice sample for cloning */
  voiceSampleBase64?: string;

  /** Video engine selection (deprecated - use selectedEngines) */
  videoEngine?: VideoEngine;

  /** Selected engines for multi-engine generation */
  selectedEngines?: VideoEngine[];

  /** HeyGen talking photo ID (optional - uses preset if not provided) */
  talkingPhotoId?: string;

  /** HeyGen voice ID (optional - uses Satoshi if not provided) */
  heygenVoiceId?: string;

  /** Custom narration text (overrides generated script) */
  narrationText?: string;

  /** Audio file for lip-sync (optional) */
  audioUrl?: string;
}

export interface PipelineV2Options {
  /** Language */
  language?: 'ja' | 'en' | 'zh';
  /** Video duration */
  duration?: number;
  /** Use mock for testing */
  useMock?: boolean;
  /** Verbose logging */
  verbose?: boolean;
}

export interface VideoEngineResult {
  engine: VideoEngine;
  success: boolean;
  videoUrl?: string;
  localPath?: string;
  processingTime: number;
  error?: string;
}

export interface PipelineV2Result {
  success: boolean;
  /** Results from each engine */
  videos: {
    kling?: VideoEngineResult;
    heygen?: VideoEngineResult;
    seedance?: VideoEngineResult;
    veo3?: VideoEngineResult;
    sora2?: VideoEngineResult;
  };
  /** Composite image if generated */
  compositeImage?: string;
  /** Recommended video */
  recommended?: VideoEngineResult;
  /** Metadata */
  metadata: {
    productAnalysis?: ProductAnalysis;
    persona?: Persona;
    script?: UGCScript;
    personProfile?: PersonProfile;
    totalProcessingTime: number;
  };
  error?: string;
}

// ========== Default HeyGen Presets ==========

const HEYGEN_PRESETS = {
  // Japanese female presenter
  japaneseWoman: {
    talkingPhotoId: '6013fc758b5446a2ba17d8c459538bb4',
    voiceId: 'df8b601598534e809e2baac52360dc7f', // Morioki - female
  },
  // Japanese male presenter
  japaneseMale: {
    talkingPhotoId: '9874061c71564f27a9d9f7eaadf51698',
    voiceId: '662e1397965c484e8f65fa58c77effde', // Satoshi - male
  },
};

// ========== Pipeline V2 Class ==========

export class PipelineV2 {
  private imageInput: ImageInputModule;
  private visionAnalyzer: VisionAnalyzer;
  private scriptGenerator: ScriptGenerator;
  private imageProcessor: ImageProcessor;
  private klingGenerator: VideoGenerator | null = null;
  private heygenGenerator: HeyGenGenerator | null = null;
  private seedanceGenerator: SeedanceGenerator | null = null;
  private veo3Generator: Veo3Generator | null = null;
  private sora2Generator: Sora2Generator | null = null;
  private voiceGenerator: VoiceGenerator;
  private personAnalyzer: PersonAnalyzer;
  private voiceCloner: VoiceCloner;
  private aiCompositor: AICompositor;
  private options: PipelineV2Options;

  constructor(options: PipelineV2Options = {}) {
    this.options = {
      language: 'ja',
      duration: 10,
      useMock: false,
      verbose: true,
      ...options,
    };

    // Initialize modules
    this.imageInput = new ImageInputModule();

    this.visionAnalyzer = new VisionAnalyzer({
      useMock: options.useMock,
    });

    this.scriptGenerator = new ScriptGenerator({
      useMock: options.useMock,
      language: options.language || 'ja',
    });

    this.imageProcessor = new ImageProcessor({
      nanoBananaApiKey: process.env.NANOBANANA_API_KEY || '',
      nanoBananaEndpoint: process.env.NANOBANANA_ENDPOINT || '',
    });

    // Initialize Kling if available
    if (process.env.REPLICATE_API_TOKEN) {
      this.klingGenerator = new VideoGenerator({
        replicateApiToken: process.env.REPLICATE_API_TOKEN,
        useMock: options.useMock,
      });
      this.log('✓ Kling generator initialized');
    }

    // Initialize HeyGen if available
    if (process.env.HEYGEN_API_KEY) {
      this.heygenGenerator = new HeyGenGenerator({
        apiKey: process.env.HEYGEN_API_KEY,
      });
      this.log('✓ HeyGen generator initialized');
    }

    // Initialize Seedance if available (BytePlus ModelArk)
    if (process.env.ARK_API_KEY) {
      this.seedanceGenerator = new SeedanceGenerator({
        apiKey: process.env.ARK_API_KEY,
      });
      this.log('✓ Seedance generator initialized (BytePlus ModelArk)');
    }

    // Initialize Veo3 if available (Gemini API)
    if (process.env.GEMINI_API_KEY) {
      this.veo3Generator = new Veo3Generator({
        apiKey: process.env.GEMINI_API_KEY,
      });
      this.log('✓ Veo3 generator initialized (Gemini API)');
    }

    // Initialize Sora2 if available (Replicate API)
    if (process.env.REPLICATE_API_TOKEN) {
      this.sora2Generator = new Sora2Generator({
        replicateApiToken: process.env.REPLICATE_API_TOKEN,
        useMock: options.useMock,
      });
      this.log('✓ Sora2 generator initialized (Replicate API)');
    }

    this.voiceGenerator = new VoiceGenerator({
      useMock: options.useMock,
    });

    this.personAnalyzer = new PersonAnalyzer({
      geminiApiKey: process.env.GEMINI_API_KEY,
      useMock: options.useMock,
    });

    this.voiceCloner = new VoiceCloner({
      useMock: options.useMock,
    });

    this.aiCompositor = new AICompositor({
      geminiApiKey: process.env.GEMINI_API_KEY,
      verbose: options.verbose,
    });
  }

  /**
   * Generate video with V2 pipeline
   */
  async generate(input: PipelineV2Input): Promise<PipelineV2Result> {
    const startTime = Date.now();

    // Use selectedEngines if provided, otherwise fall back to videoEngine
    const selectedEngines = input.selectedEngines;
    const engine: VideoEngine = input.videoEngine || 'both';

    this.log('═══════════════════════════════════════════');
    this.log('   Pipeline V2 - Starting Generation');
    this.log(`   Engine: ${selectedEngines ? selectedEngines.join(', ') : engine}`);
    this.log('═══════════════════════════════════════════');

    try {
      // Stage 1: Load and validate image
      this.log('\n📷 Stage 1: Loading image...');
      const imageBase64 = await this.loadImage(input);

      // Stage 2: Analyze product
      this.log('\n🔍 Stage 2: Analyzing product...');
      const productAnalysis = await this.visionAnalyzer.analyze(imageBase64);
      this.log(`   Product: ${productAnalysis.productName}`);

      // Stage 3: Generate script
      this.log('\n📝 Stage 3: Generating script...');
      const { persona, script } = await this.scriptGenerator.generateFullScript(productAnalysis);
      this.log(`   Persona: ${persona.name}`);
      this.log(`   Scenes: ${script.scenes.length}`);

      // Stage 4: Prepare narration text
      const narrationText = input.narrationText ||
        script.scenes.map(s => s.narration).join(' ');
      this.log(`   Narration: ${narrationText.substring(0, 50)}...`);

      // Stage 5: Generate videos
      this.log('\n🎬 Stage 5: Generating videos...');
      const videos = selectedEngines ?
        await this.generateWithSelectedEngines(input, imageBase64, narrationText, selectedEngines) :
        await this.generateVideos(input, imageBase64, narrationText, engine);

      // Determine recommended video
      let recommended: VideoEngineResult | undefined;
      if (videos.heygen?.success && videos.kling?.success) {
        // Both succeeded - recommend based on use case
        recommended = input.personImageBase64 || input.audioUrl
          ? videos.heygen  // Lip-sync → HeyGen
          : videos.kling;  // Motion → Kling
      } else if (videos.heygen?.success) {
        recommended = videos.heygen;
      } else if (videos.kling?.success) {
        recommended = videos.kling;
      }

      const totalTime = Date.now() - startTime;

      this.log('\n═══════════════════════════════════════════');
      this.log('   Generation Complete!');
      this.log(`   Total time: ${Math.floor(totalTime / 1000)}s`);
      if (recommended) {
        this.log(`   Recommended: ${recommended.engine}`);
      }
      this.log('═══════════════════════════════════════════\n');

      return {
        success: !!(videos.kling?.success || videos.heygen?.success),
        videos,
        recommended,
        metadata: {
          productAnalysis,
          persona,
          script,
          totalProcessingTime: totalTime,
        },
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      return {
        success: false,
        videos: {},
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          totalProcessingTime: totalTime,
        },
      };
    }
  }

  /**
   * Generate with selected engines (new multi-select approach)
   */
  private async generateWithSelectedEngines(
    input: PipelineV2Input,
    imageBase64: string,
    narrationText: string,
    selectedEngines: VideoEngine[]
  ): Promise<PipelineV2Result['videos']> {
    const results: PipelineV2Result['videos'] = {};

    // Create promises for selected engines
    const promises: Promise<[string, VideoEngineResult]>[] = [];

    for (const engine of selectedEngines) {
      if (engine === 'all') {
        // "all" means run all available engines
        const allResult = await this.generateWithAllEngines(input);
        return allResult.videos;
      }

      switch (engine) {
        case 'kling':
          promises.push(
            this.generateWithKling(imageBase64, narrationText)
              .then(r => ['kling', r] as [string, VideoEngineResult])
              .catch(e => ['kling', { engine: 'kling', success: false, error: e.message, processingTime: 0 }] as [string, VideoEngineResult])
          );
          break;
        case 'heygen':
          promises.push(
            this.generateWithHeyGen(input, narrationText)
              .then(r => ['heygen', r] as [string, VideoEngineResult])
              .catch(e => ['heygen', { engine: 'heygen', success: false, error: e.message, processingTime: 0 }] as [string, VideoEngineResult])
          );
          break;
        case 'seedance':
          promises.push(
            this.generateWithSeedance(imageBase64, narrationText)
              .then(r => ['seedance', r] as [string, VideoEngineResult])
              .catch(e => ['seedance', { engine: 'seedance', success: false, error: e.message, processingTime: 0 }] as [string, VideoEngineResult])
          );
          break;
        case 'veo3':
          promises.push(
            this.generateWithVeo3(imageBase64, narrationText)
              .then(r => ['veo3', r] as [string, VideoEngineResult])
              .catch(e => ['veo3', { engine: 'veo3', success: false, error: e.message, processingTime: 0 }] as [string, VideoEngineResult])
          );
          break;
        case 'sora2':
          promises.push(
            this.generateWithSora2(imageBase64, narrationText)
              .then(r => ['sora2', r] as [string, VideoEngineResult])
              .catch(e => ['sora2', { engine: 'sora2', success: false, error: e.message, processingTime: 0 }] as [string, VideoEngineResult])
          );
          break;
      }
    }

    // Run all selected engines in parallel
    const settled = await Promise.all(promises);

    // Map results
    for (const [engine, result] of settled) {
      (results as Record<string, VideoEngineResult>)[engine] = result;
    }

    return results;
  }

  /**
   * Generate videos with selected engines (legacy compatibility)
   */
  private async generateVideos(
    input: PipelineV2Input,
    imageBase64: string,
    narrationText: string,
    engine: VideoEngine
  ): Promise<PipelineV2Result['videos']> {
    const results: PipelineV2Result['videos'] = {};

    if (engine === 'both') {
      // Run both in parallel
      const [klingResult, heygenResult] = await Promise.allSettled([
        this.generateWithKling(imageBase64, narrationText),
        this.generateWithHeyGen(input, narrationText),
      ]);

      if (klingResult.status === 'fulfilled') {
        results.kling = klingResult.value;
      } else {
        results.kling = {
          engine: 'kling',
          success: false,
          error: klingResult.reason?.message || 'Unknown error',
          processingTime: 0,
        };
      }

      if (heygenResult.status === 'fulfilled') {
        results.heygen = heygenResult.value;
      } else {
        results.heygen = {
          engine: 'heygen',
          success: false,
          error: heygenResult.reason?.message || 'Unknown error',
          processingTime: 0,
        };
      }
    } else if (engine === 'kling') {
      results.kling = await this.generateWithKling(imageBase64, narrationText);
    } else if (engine === 'heygen') {
      results.heygen = await this.generateWithHeyGen(input, narrationText);
    } else if (engine === 'seedance') {
      results.seedance = await this.generateWithSeedance(imageBase64, narrationText);
    } else if (engine === 'veo3') {
      results.veo3 = await this.generateWithVeo3(imageBase64, narrationText);
    } else if (engine === 'sora2') {
      results.sora2 = await this.generateWithSora2(imageBase64, narrationText);
    } else if (engine === 'all') {
      // Run all engines in parallel
      const allResult = await this.generateWithAllEngines(input);
      return allResult.videos;
    }

    return results;
  }

  /**
   * Generate with Kling
   */
  private async generateWithKling(
    imageBase64: string,
    _narrationText: string
  ): Promise<VideoEngineResult> {
    const startTime = Date.now();
    this.log('   [Kling] Starting...');

    if (!this.klingGenerator) {
      return {
        engine: 'kling',
        success: false,
        error: 'Kling not initialized (REPLICATE_API_TOKEN not set)',
        processingTime: 0,
      };
    }

    try {
      // Resize image for Kling
      const resized = await this.imageProcessor.resizeTo720x1280(imageBase64);

      const prompt = `A presenter shows this product to the camera with enthusiasm.
Natural UGC style video, soft professional lighting.
The presenter holds the product gently and turns it to show the label.
Smooth natural movements, authentic style.`;

      const result = await this.klingGenerator.generateAndWait({
        firstFrameImage: resized.base64,
        prompt,
        duration: this.options.duration,
        aspectRatio: '9:16',
      });

      this.log(`   [Kling] ✓ Completed in ${Math.floor((Date.now() - startTime) / 1000)}s`);

      return {
        engine: 'kling',
        success: true,
        videoUrl: result.videoUrl,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.log(`   [Kling] ✗ Failed: ${error instanceof Error ? error.message : error}`);
      return {
        engine: 'kling',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate with HeyGen
   */
  private async generateWithHeyGen(
    input: PipelineV2Input,
    narrationText: string
  ): Promise<VideoEngineResult> {
    const startTime = Date.now();
    this.log('   [HeyGen] Starting...');

    if (!this.heygenGenerator) {
      return {
        engine: 'heygen',
        success: false,
        error: 'HeyGen not initialized (HEYGEN_API_KEY not set)',
        processingTime: 0,
      };
    }

    try {
      // Use provided IDs or defaults
      const talkingPhotoId = input.talkingPhotoId || HEYGEN_PRESETS.japaneseWoman.talkingPhotoId;
      const voiceId = input.heygenVoiceId || HEYGEN_PRESETS.japaneseWoman.voiceId;

      const result = await this.heygenGenerator.generateAndWait({
        talkingPhotoId,
        text: narrationText,
        voiceId,
        audioUrl: input.audioUrl,
        aspectRatio: '9:16',
      });

      this.log(`   [HeyGen] ✓ Completed in ${Math.floor((Date.now() - startTime) / 1000)}s`);

      return {
        engine: 'heygen',
        success: true,
        videoUrl: result.videoUrl,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.log(`   [HeyGen] ✗ Failed: ${error instanceof Error ? error.message : error}`);
      return {
        engine: 'heygen',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate with Seedance (ByteDance - World #1 Ranked Model)
   */
  private async generateWithSeedance(
    imageBase64: string,
    _narrationText: string
  ): Promise<VideoEngineResult> {
    const startTime = Date.now();
    this.log('   [Seedance] Starting...');

    if (!this.seedanceGenerator) {
      return {
        engine: 'seedance',
        success: false,
        error: 'Seedance not initialized (ARK_API_KEY not set)',
        processingTime: 0,
      };
    }

    try {
      const prompt = `A presenter shows this product to the camera with enthusiasm.
Cinematic quality, smooth motion, vivid details.
The presenter holds the product gently and turns it to show features.
Natural UGC style, soft professional lighting.`;

      const result = await this.seedanceGenerator.generateAndWait({
        imageBase64,
        prompt,
        resolution: '720p',
        aspectRatio: '9:16',
        duration: 5,
      });

      this.log(`   [Seedance] ✓ Completed in ${Math.floor((Date.now() - startTime) / 1000)}s`);

      return {
        engine: 'seedance',
        success: true,
        videoUrl: result.videoUrl,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.log(`   [Seedance] ✗ Failed: ${error instanceof Error ? error.message : error}`);
      return {
        engine: 'seedance',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate with Veo3 (Google - Native Audio Support)
   */
  private async generateWithVeo3(
    imageBase64: string,
    narrationText: string
  ): Promise<VideoEngineResult> {
    const startTime = Date.now();
    this.log('   [Veo3] Starting...');

    if (!this.veo3Generator) {
      return {
        engine: 'veo3',
        success: false,
        error: 'Veo3 not initialized (GEMINI_API_KEY not set)',
        processingTime: 0,
      };
    }

    try {
      const prompt = `A presenter shows this product to the camera with enthusiasm.
${narrationText ? `She speaks: "${narrationText}"` : ''}
Cinematic quality, smooth motion, professional lighting.
The presenter holds the product gently and shows it naturally.
UGC influencer style, vertical video format.`;

      const result = await this.veo3Generator.generateAndWait({
        imageBase64,
        prompt,
        model: 'veo-3.1-generate-preview',
        enableAudio: false, // Set to true when on paid tier
        aspectRatio: '9:16',
      });

      this.log(`   [Veo3] ✓ Completed in ${Math.floor((Date.now() - startTime) / 1000)}s`);

      return {
        engine: 'veo3',
        success: true,
        videoUrl: result.videoUrl,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.log(`   [Veo3] ✗ Failed: ${error instanceof Error ? error.message : error}`);
      return {
        engine: 'veo3',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate with Sora2 (OpenAI - High Quality)
   */
  private async generateWithSora2(
    imageBase64: string,
    narrationText: string
  ): Promise<VideoEngineResult> {
    const startTime = Date.now();
    this.log('   [Sora2] Starting...');

    if (!this.sora2Generator) {
      return {
        engine: 'sora2',
        success: false,
        error: 'Sora2 not initialized (REPLICATE_API_TOKEN not set)',
        processingTime: 0,
      };
    }

    try {
      const prompt = `A presenter shows this product to the camera with enthusiasm.
High quality cinematic video, professional lighting, smooth motion.
The presenter holds the product gently and shows it naturally.
UGC influencer style, vertical video format.`;

      const result = await this.sora2Generator.generateAndWait({
        firstFrameImage: imageBase64,
        prompt,
        duration: 5,
        aspectRatio: '9:16',
        resolution: '720p',
      });

      this.log(`   [Sora2] ✓ Completed in ${Math.floor((Date.now() - startTime) / 1000)}s`);

      return {
        engine: 'sora2',
        success: true,
        videoUrl: result.videoUrl,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.log(`   [Sora2] ✗ Failed: ${error instanceof Error ? error.message : error}`);
      return {
        engine: 'sora2',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate with all engines in parallel
   */
  async generateWithAllEngines(input: PipelineV2Input): Promise<PipelineV2Result> {
    const startTime = Date.now();
    this.log('═══════════════════════════════════════════');
    this.log('   Pipeline V2 - All Engines Generation');
    this.log('═══════════════════════════════════════════');

    try {
      // Load image
      const imageBase64 = await this.loadImage(input);

      // Get narration
      const narrationText = input.narrationText || '';

      // Generate composite if person image provided
      let finalImageBase64 = imageBase64;
      let compositeImage: string | undefined;

      if (input.personImageBase64) {
        this.log('\n📸 Generating composite image...');
        const composite = await this.aiCompositor.generatePersonHoldingProduct({
          personImageBase64: input.personImageBase64,
          productImageBase64: imageBase64,
          width: 720,
          height: 1280,
        });
        finalImageBase64 = composite.base64;
        compositeImage = composite.base64;
        this.log(`   ✓ Composite generated (${composite.processingTime}ms)`);
      }

      // Run all engines in parallel
      this.log('\n🎬 Starting parallel generation...');
      const [kling, heygen, seedance, veo3] = await Promise.allSettled([
        this.generateWithKling(finalImageBase64, narrationText),
        this.generateWithHeyGen(input, narrationText),
        this.generateWithSeedance(finalImageBase64, narrationText),
        this.generateWithVeo3(finalImageBase64, narrationText),
      ]);

      const videos: PipelineV2Result['videos'] = {};

      if (kling.status === 'fulfilled') videos.kling = kling.value;
      if (heygen.status === 'fulfilled') videos.heygen = heygen.value;
      if (seedance.status === 'fulfilled') videos.seedance = seedance.value;
      if (veo3.status === 'fulfilled') videos.veo3 = veo3.value;

      // Find recommended (first successful)
      const recommended = Object.values(videos).find(v => v?.success);

      const success = Object.values(videos).some(v => v?.success);

      this.log('\n═══════════════════════════════════════════');
      this.log('   All Engines Generation Complete');
      this.log(`   Success: ${success}`);
      this.log(`   Total time: ${Math.floor((Date.now() - startTime) / 1000)}s`);
      this.log('═══════════════════════════════════════════');

      return {
        success,
        videos,
        compositeImage,
        recommended,
        metadata: {
          totalProcessingTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        videos: {},
        metadata: {
          totalProcessingTime: Date.now() - startTime,
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Load image from various sources
   */
  private async loadImage(input: PipelineV2Input): Promise<string> {
    if (input.imageBase64) {
      return input.imageBase64.replace(/^data:image\/\w+;base64,/, '');
    }

    if (input.imagePath) {
      const imageData = await this.imageInput.loadAndValidate(input.imagePath);
      return this.imageInput.toBase64(imageData);
    }

    if (input.imageUrl) {
      const imageData = await this.imageInput.loadAndValidate(input.imageUrl);
      return this.imageInput.toBase64(imageData);
    }

    throw new Error('No image provided (imagePath, imageUrl, or imageBase64 required)');
  }

  /**
   * Get available engines
   */
  getAvailableEngines(): VideoEngine[] {
    const engines: VideoEngine[] = [];
    if (this.klingGenerator) engines.push('kling');
    if (this.heygenGenerator) engines.push('heygen');
    if (this.seedanceGenerator) engines.push('seedance');
    if (this.veo3Generator) engines.push('veo3');
    if (engines.length > 1) engines.push('all');
    return engines;
  }

  /**
   * Log helper
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(message);
    }
  }
}

/**
 * Factory function
 */
export function createPipelineV2(options?: PipelineV2Options): PipelineV2 {
  return new PipelineV2(options);
}

// Export presets for external use
export { HEYGEN_PRESETS };
