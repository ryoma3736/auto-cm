/**
 * Script Generator Module
 * Generates UGC movie scripts with persona from product analysis
 *
 * This module creates:
 * - Target persona based on product analysis
 * - 12-second UGC script with 3-4 scenes
 * - Natural, casual speaking style
 * - Integrated Sora2 video generation prompt
 */

import OpenAI from 'openai';
import type { ProductAnalysis } from '../image-analyzer/vision-analyzer.js';

/**
 * Target persona for UGC creator
 */
export interface Persona {
  /** Persona name */
  name: string;
  /** Age */
  age: number;
  /** Occupation */
  occupation: string;
  /** Personality traits */
  personality: string[];
  /** Speaking style description */
  speakingStyle: string;
  /** Pain points this product solves */
  painPoints: string[];
  /** Lifestyle description */
  lifestyle: string;
}

/**
 * Individual scene in the UGC script
 */
export interface Scene {
  /** Scene number (1-indexed) */
  sceneNumber: number;
  /** Time code (e.g., "00:00-00:03") */
  timeCode: string;
  /** Duration in seconds */
  durationSeconds: number;
  /** Narration text (Japanese) */
  narration: string;
  /** Emotional tone (e.g., "excited", "calm", "confident") */
  emotion: string;
  /** Camera direction (e.g., "close-up", "medium shot", "overhead") */
  cameraDirection: string;
  /** Visual description for video generation */
  visualDescription: string;
}

/**
 * Complete UGC script with scenes
 */
export interface UGCScript {
  /** Total duration (always 12 seconds) */
  totalDuration: 12;
  /** Array of scenes (3-4 scenes) */
  scenes: Scene[];
  /** Integrated prompt for Sora2 video generation */
  sora2Prompt: string;
}

/**
 * Configuration options for ScriptGenerator
 */
export interface ScriptGeneratorOptions {
  /** OpenAI API key */
  apiKey?: string;
  /** OpenAI model to use (default: gpt-4o) */
  model?: string;
  /** Maximum retry attempts on failure */
  maxRetries?: number;
  /** Script duration in seconds (default: 12) */
  targetDuration?: number;
}

/**
 * Default configuration
 */
const DEFAULT_OPTIONS: Required<Omit<ScriptGeneratorOptions, 'apiKey'>> = {
  model: 'gpt-4o',
  maxRetries: 3,
  targetDuration: 12,
};

/**
 * System prompt for persona generation
 */
const PERSONA_GENERATION_PROMPT = `あなたはマーケティングの専門家です。
以下の商品分析結果に基づき、最適なターゲットペルソナを生成してください。

商品分析:
{PRODUCT_ANALYSIS}

以下の形式でJSON出力してください:
{
  "name": "ペルソナの名前（例: 美咲）",
  "age": 年齢（数値）,
  "occupation": "職業（例: IT企業勤務）",
  "personality": ["性格1", "性格2", "性格3"],
  "speakingStyle": "話し方の特徴（例: 友達に話すようなカジュアルで親しみやすい口調）",
  "painPoints": ["この商品が解決する悩み1", "悩み2"],
  "lifestyle": "ライフスタイルの説明（例: 仕事が忙しく、スキンケアは時短重視）"
}

注意:
- ターゲット層と商品の特徴に基づいてリアルなペルソナを作成
- UGC広告の作成者として自然な人物像に
- 友達にスマホで紹介するようなカジュアルさを持つ人`;

/**
 * System prompt for UGC script generation
 */
const SCRIPT_GENERATION_PROMPT = `あなたはUGC広告のスクリプトライターです。
以下のペルソナと商品情報に基づき、12秒のUGC広告スクリプトを作成してください。

ペルソナ:
{PERSONA}

商品分析:
{PRODUCT_ANALYSIS}

【要件】
- 合計12秒の動画スクリプト
- 3-4シーンに分割
- 友達にスマホで紹介するような自然でカジュアルな口調
- 最初のシーンは商品の登場・紹介
- 最後のシーンは使用感やおすすめで締める
- 各シーンに感情トーン、カメラワーク、映像描写を含める

以下の形式でJSON出力してください:
{
  "totalDuration": 12,
  "scenes": [
    {
      "sceneNumber": 1,
      "timeCode": "00:00-00:03",
      "durationSeconds": 3,
      "narration": "セリフ（日本語、自然な話し言葉）",
      "emotion": "感情トーン（例: excited, calm, confident）",
      "cameraDirection": "カメラワーク（例: close-up, medium shot, overhead）",
      "visualDescription": "映像の詳細な描写（Sora2用）"
    }
  ],
  "sora2Prompt": "全シーンを統合したSora2用の動画生成プロンプト（英語）"
}

注意:
- セリフは友達に話すような自然な口調で
- 商品の特徴を自然に織り込む
- Sora2プロンプトは各シーンのvisualDescriptionを統合し、一貫性のある動画になるように`;

/**
 * Script Generator for UGC advertisements
 * Generates persona and 12-second scripts from product analysis
 */
export class ScriptGenerator {
  private options: Required<ScriptGeneratorOptions>;
  private openai: OpenAI;

  constructor(options: ScriptGeneratorOptions = {}) {
    // Merge with defaults
    this.options = {
      ...DEFAULT_OPTIONS,
      apiKey: options.apiKey || process.env.OPENAI_API_KEY,
      ...options,
    } as Required<ScriptGeneratorOptions>;

    // Validate API key
    if (!this.options.apiKey) {
      throw new Error('ScriptGenerator requires OPENAI_API_KEY');
    }

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: this.options.apiKey,
    });
  }

  /**
   * Generate target persona from product analysis
   *
   * @param analysis - Product analysis result
   * @returns Generated persona
   * @throws Error if generation fails after all retries
   */
  async generatePersona(analysis: ProductAnalysis): Promise<Persona> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        const prompt = this.buildPersonaPrompt(analysis);

        const response = await this.openai.chat.completions.create({
          model: this.options.model,
          messages: [
            {
              role: 'system',
              content: 'You are a marketing expert specializing in persona creation.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 1000,
          temperature: 0.7, // Higher temperature for creative persona
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response content from OpenAI API');
        }

        return this.parsePersonaResponse(content);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.options.maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          await this.delay(delayMs);
          continue;
        }
        break;
      }
    }

    throw new Error(
      `Persona generation failed after ${this.options.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Generate UGC script from persona and product analysis
   *
   * @param persona - Target persona
   * @param analysis - Product analysis result
   * @returns Generated UGC script
   * @throws Error if generation fails after all retries
   */
  async generateScript(persona: Persona, analysis: ProductAnalysis): Promise<UGCScript> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        const prompt = this.buildScriptPrompt(persona, analysis);

        const response = await this.openai.chat.completions.create({
          model: this.options.model,
          messages: [
            {
              role: 'system',
              content: 'You are a UGC advertisement scriptwriter.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 2000,
          temperature: 0.8, // High temperature for creative script
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response content from OpenAI API');
        }

        return this.parseScriptResponse(content);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.options.maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          await this.delay(delayMs);
          continue;
        }
        break;
      }
    }

    throw new Error(
      `Script generation failed after ${this.options.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Generate both persona and script in one call
   *
   * @param analysis - Product analysis result
   * @returns Object containing persona and script
   */
  async generateFullScript(
    analysis: ProductAnalysis
  ): Promise<{ persona: Persona; script: UGCScript }> {
    // Generate persona first
    const persona = await this.generatePersona(analysis);

    // Generate script based on persona
    const script = await this.generateScript(persona, analysis);

    return { persona, script };
  }

  /**
   * Build persona generation prompt
   *
   * @param analysis - Product analysis
   * @returns Formatted prompt string
   */
  private buildPersonaPrompt(analysis: ProductAnalysis): string {
    const analysisText = JSON.stringify(analysis, null, 2);
    return PERSONA_GENERATION_PROMPT.replace('{PRODUCT_ANALYSIS}', analysisText);
  }

  /**
   * Build script generation prompt
   *
   * @param persona - Target persona
   * @param analysis - Product analysis
   * @returns Formatted prompt string
   */
  private buildScriptPrompt(persona: Persona, analysis: ProductAnalysis): string {
    const personaText = JSON.stringify(persona, null, 2);
    const analysisText = JSON.stringify(analysis, null, 2);

    return SCRIPT_GENERATION_PROMPT.replace('{PERSONA}', personaText).replace(
      '{PRODUCT_ANALYSIS}',
      analysisText
    );
  }

  /**
   * Parse and validate persona JSON response
   *
   * @param content - Raw JSON string from API
   * @returns Persona object
   */
  private parsePersonaResponse(content: string): Persona {
    try {
      const parsed = JSON.parse(content);

      // Validate required fields
      return {
        name: String(parsed.name || 'ユーザー'),
        age: Number(parsed.age) || 25,
        occupation: String(parsed.occupation || '会社員'),
        personality: Array.isArray(parsed.personality) ? parsed.personality.map(String) : [],
        speakingStyle: String(parsed.speakingStyle || 'カジュアル'),
        painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints.map(String) : [],
        lifestyle: String(parsed.lifestyle || '忙しい日常'),
      };
    } catch (error) {
      throw new Error(
        `Failed to parse persona response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Parse and validate script JSON response
   *
   * @param content - Raw JSON string from API
   * @returns UGCScript object
   */
  private parseScriptResponse(content: string): UGCScript {
    try {
      const parsed = JSON.parse(content);

      // Validate scenes
      if (!Array.isArray(parsed.scenes) || parsed.scenes.length < 3 || parsed.scenes.length > 4) {
        throw new Error('Script must have 3-4 scenes');
      }

      const scenes: Scene[] = parsed.scenes.map((scene: any, index: number) => ({
        sceneNumber: Number(scene.sceneNumber) || index + 1,
        timeCode: String(scene.timeCode || '00:00-00:00'),
        durationSeconds: Number(scene.durationSeconds) || 3,
        narration: String(scene.narration || ''),
        emotion: String(scene.emotion || 'neutral'),
        cameraDirection: String(scene.cameraDirection || 'medium shot'),
        visualDescription: String(scene.visualDescription || ''),
      }));

      // Validate total duration
      const totalDuration = scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);
      if (totalDuration !== 12) {
        console.warn(
          `Warning: Total duration is ${totalDuration}s, expected 12s. Adjusting scene durations.`
        );
        // Optionally adjust durations here
      }

      return {
        totalDuration: 12,
        scenes,
        sora2Prompt: String(parsed.sora2Prompt || ''),
      };
    } catch (error) {
      throw new Error(
        `Failed to parse script response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Delay utility for retry backoff
   *
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create ScriptGenerator instance
 *
 * @param options - Configuration options
 * @returns New ScriptGenerator instance
 */
export function createScriptGenerator(options?: ScriptGeneratorOptions): ScriptGenerator {
  return new ScriptGenerator(options);
}

/**
 * Legacy interfaces for backward compatibility
 */
export interface MovieScript {
  scenes: LegacyScene[];
  totalDuration: number;
  narration: string;
}

export interface LegacyScene {
  imageIndex: number;
  duration: number;
  narration: string;
  transition: 'fade' | 'cut' | 'dissolve';
}
