/**
 * Pipeline Module
 * Orchestrates the entire movie creation workflow
 */

import { ImageAnalyzer } from '../modules/image-analyzer/index.js';
import { ScriptGenerator } from '../modules/script-generator/index.js';
import { ImageProcessor } from '../modules/image-processor/index.js';
import { VideoGenerator } from '../modules/video-generator/index.js';
import { Storage } from '../modules/storage/index.js';
import type { Config } from '../config/default.js';

export interface PipelineOptions {
  config: Config;
  uploadToGoogleDrive?: boolean;
}

export interface PipelineResult {
  videoPath: string;
  duration: number;
  uploadResult?: {
    fileId: string;
    webViewLink: string;
  };
}

export class MovieCreationPipeline {
  private imageAnalyzer: ImageAnalyzer;
  private scriptGenerator: ScriptGenerator;
  private imageProcessor: ImageProcessor;
  private videoGenerator: VideoGenerator;
  private storage: Storage;
  private options: PipelineOptions;

  constructor(options: PipelineOptions) {
    this.options = options;
    const { config } = options;

    this.imageAnalyzer = new ImageAnalyzer({
      apiKey: config.openai.apiKey,
      model: config.openai.model,
    });

    this.scriptGenerator = new ScriptGenerator({
      apiKey: config.openai.apiKey,
    });

    this.imageProcessor = new ImageProcessor({
      nanoBananaApiKey: config.nanoBanana.apiKey,
      nanoBananaEndpoint: config.nanoBanana.endpoint,
    });

    this.videoGenerator = new VideoGenerator({
      sora2ApiKey: config.sora2.apiKey,
      sora2Endpoint: config.sora2.endpoint,
    });

    this.storage = new Storage({
      googleDriveCredentialsPath: config.googleDrive.credentialsPath,
      outputDirectory: config.storage.outputDirectory,
      tempDirectory: config.storage.tempDirectory,
    });
  }

  /**
   * Execute the complete movie creation pipeline
   */
  async execute(_inputImages: string[]): Promise<PipelineResult> {
    // TODO: Implement full pipeline
    // 1. Analyze images
    // 2. Generate script
    // 3. Process images
    // 4. Generate video
    // 5. Upload to Google Drive (optional)
    throw new Error('Not implemented yet');
  }

  /**
   * Execute individual pipeline steps
   */
  async analyzeImages(imagePaths: string[]) {
    return this.imageAnalyzer.analyzeImages(imagePaths);
  }

  /**
   * Generate UGC script from product analysis
   * @param analysis - Product analysis result
   * @returns Generated persona and script
   */
  async generateScript(analysis: import('../modules/image-analyzer/vision-analyzer.js').ProductAnalysis) {
    return this.scriptGenerator.generateFullScript(analysis);
  }

  async processImages(_imagePaths: string[]) {
    // TODO: Implement image processing step
    throw new Error('Not implemented yet');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async generateVideo(imagePaths: string[], script: any, outputPath: string) {
    return this.videoGenerator.generateVideo(imagePaths, script, outputPath);
  }
}
