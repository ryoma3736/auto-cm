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
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  /** Google Gemini API key (preferred) */
  geminiApiKey?: string;
  /** OpenAI model to use (default: gpt-5) */
  model?: string;
  /** Gemini model to use (default: gemini-2.0-flash-exp) */
  geminiModel?: string;
  /** Maximum retry attempts on failure */
  maxRetries?: number;
  /** Script duration in seconds (default: 12) */
  targetDuration?: number;
  /** Use mock implementation (for testing) */
  useMock?: boolean;
  /** Use Gemini as primary provider (default: true) */
  useGeminiPrimary?: boolean;
  /** Script language (ja, en, zh) */
  language?: 'ja' | 'en' | 'zh';
}

/**
 * Default configuration
 */
const DEFAULT_OPTIONS: Required<Omit<ScriptGeneratorOptions, 'apiKey' | 'geminiApiKey'>> = {
  model: 'gpt-5',
  geminiModel: 'gemini-2.0-flash-exp',
  maxRetries: 3,
  targetDuration: 12,
  useMock: false,
  useGeminiPrimary: true, // Gemini is now the default
  language: 'ja',
};

/**
 * Language-specific instructions for script generation
 * 言語設定に基づいて国籍・人種も自動的に決定
 */
const LANGUAGE_INSTRUCTIONS: Record<'ja' | 'en' | 'zh', {
  personaLang: string;
  scriptLang: string;
  example: string;
  nameExample: string;
  narrationLabel: string;
  nationality: string;
  ethnicDescription: string;
  locationExample: string;
}> = {
  ja: {
    personaLang: '【必須】日本語でペルソナを生成。日本人の名前を使用（例: 美咲、遥、さくら）。全ての出力を日本語で。',
    scriptLang: '【絶対厳守】narrationフィールドは100%日本語で書くこと。英語禁止。日本語の自然な話し言葉で、友達に話すようなカジュアルな口調で書いてください。',
    example: '例: 「ねぇねぇ、これ見て！」「マジでこれいいよ！」「めっちゃ使いやすいの！」「絶対おすすめ！」',
    nameExample: '美咲',
    narrationLabel: '【日本語で書くこと】',
    nationality: 'Japanese',
    ethnicDescription: 'Japanese woman with black hair',
    locationExample: 'bright modern apartment in Tokyo',
  },
  en: {
    personaLang: 'Generate persona in English. Use an American/English name.',
    scriptLang: 'Write ALL narration in natural, casual English. Like talking to a friend on social media.',
    example: 'Example: "OMG you guys, this is SO good! I literally can\'t stop using it!"',
    nameExample: 'Emma',
    narrationLabel: 'Narration (casual English, like talking to a friend)',
    nationality: 'American',
    ethnicDescription: 'American woman with blonde or brown hair',
    locationExample: 'bright modern apartment in Los Angeles',
  },
  zh: {
    personaLang: '用中文生成角色。使用中文名字。',
    scriptLang: '用自然的中文口语写台词。像跟朋友聊天一样轻松随意。',
    example: '例如：姐妹们！这个真的太好用了！我已经回购三次了！',
    nameExample: '小雨',
    narrationLabel: '台词（自然的中文口语）',
    nationality: 'Chinese',
    ethnicDescription: 'Chinese woman with long black hair',
    locationExample: 'bright modern apartment in Shanghai',
  },
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
  private openai?: OpenAI;
  private gemini?: GoogleGenerativeAI;
  private useMock: boolean;

  constructor(options: ScriptGeneratorOptions = {}) {
    this.useMock = options.useMock || false;

    // Merge with defaults
    this.options = {
      ...DEFAULT_OPTIONS,
      apiKey: options.apiKey || process.env.OPENAI_API_KEY,
      geminiApiKey: options.geminiApiKey || process.env.GEMINI_API_KEY,
      useMock: this.useMock,
      ...options,
    } as Required<ScriptGeneratorOptions>;

    // Skip API key validation in mock mode
    if (this.useMock) {
      return;
    }

    // Initialize Gemini client if API key is available (preferred)
    if (this.options.geminiApiKey) {
      this.gemini = new GoogleGenerativeAI(this.options.geminiApiKey);
    }

    // Initialize OpenAI client if API key is available (fallback)
    if (this.options.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.options.apiKey,
      });
    }

    // Validate that at least one provider is configured
    if (!this.gemini && !this.openai) {
      throw new Error('ScriptGenerator requires GEMINI_API_KEY or OPENAI_API_KEY');
    }
  }

  /**
   * Generate target persona from product analysis
   *
   * @param analysis - Product analysis result
   * @returns Generated persona
   * @throws Error if generation fails after all retries
   */
  async generatePersona(analysis: ProductAnalysis): Promise<Persona> {
    // Return mock data if in mock mode
    if (this.useMock) {
      return this.generatePersonaMock(analysis);
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        const prompt = this.buildPersonaPrompt(analysis);

        // Try Gemini first if available and preferred
        if (this.options.useGeminiPrimary && this.gemini) {
          try {
            return await this.generateWithGemini(prompt, 'persona');
          } catch (geminiError) {
            lastError = geminiError instanceof Error ? geminiError : new Error(String(geminiError));
            console.log(`Gemini persona generation failed, trying fallback: ${lastError.message}`);
            // Fallback to OpenAI
            if (this.openai) {
              return await this.generateWithOpenAI(prompt, 'persona');
            }
            throw geminiError;
          }
        }

        // Use OpenAI if Gemini is not primary or not available
        if (this.openai) {
          return await this.generateWithOpenAI(prompt, 'persona');
        }

        throw new Error('No available AI provider');
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
    // Return mock data if in mock mode
    if (this.useMock) {
      return this.generateScriptMock(persona, analysis);
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        const prompt = this.buildScriptPrompt(persona, analysis);

        // Try Gemini first if available and preferred
        if (this.options.useGeminiPrimary && this.gemini) {
          try {
            return await this.generateWithGemini(prompt, 'script');
          } catch (geminiError) {
            lastError = geminiError instanceof Error ? geminiError : new Error(String(geminiError));
            console.log(`Gemini script generation failed, trying fallback: ${lastError.message}`);
            // Fallback to OpenAI
            if (this.openai) {
              return await this.generateWithOpenAI(prompt, 'script');
            }
            throw geminiError;
          }
        }

        // Use OpenAI if Gemini is not primary or not available
        if (this.openai) {
          return await this.generateWithOpenAI(prompt, 'script');
        }

        throw new Error('No available AI provider');
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
   * Generate content using Gemini API
   */
  private async generateWithGemini<T>(prompt: string, type: 'persona' | 'script'): Promise<T> {
    if (!this.gemini) {
      throw new Error('Gemini client not initialized');
    }

    const model = this.gemini.getGenerativeModel({ model: this.options.geminiModel });

    const systemPrompt = type === 'persona'
      ? 'You are a marketing expert specializing in persona creation. Return only valid JSON.'
      : 'You are a UGC advertisement scriptwriter. Return only valid JSON.';

    const response = await model.generateContent([
      { text: systemPrompt + '\n\n' + prompt + '\n\nJSON形式のみで返答してください。' }
    ]);

    const content = response.response.text();
    if (!content) {
      throw new Error('No response content from Gemini API');
    }

    // Extract JSON from response
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

    if (type === 'persona') {
      return this.parsePersonaResponse(jsonString) as T;
    } else {
      return this.parseScriptResponse(jsonString) as T;
    }
  }

  /**
   * Generate content using OpenAI API
   */
  private async generateWithOpenAI<T>(prompt: string, type: 'persona' | 'script'): Promise<T> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const systemContent = type === 'persona'
      ? 'You are a marketing expert specializing in persona creation.'
      : 'You are a UGC advertisement scriptwriter.';

    const response = await this.openai.chat.completions.create({
      model: this.options.model,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: type === 'persona' ? 1000 : 2000,
      temperature: type === 'persona' ? 0.7 : 0.8,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI API');
    }

    if (type === 'persona') {
      return this.parsePersonaResponse(content) as T;
    } else {
      return this.parseScriptResponse(content) as T;
    }
  }

  /**
   * Build persona generation prompt
   *
   * @param analysis - Product analysis
   * @returns Formatted prompt string
   */
  private buildPersonaPrompt(analysis: ProductAnalysis): string {
    const analysisText = JSON.stringify(analysis, null, 2);
    const lang = this.options.language || 'ja';
    const langInstructions = LANGUAGE_INSTRUCTIONS[lang];

    // Japanese prompt is completely in Japanese
    if (lang === 'ja') {
      return `あなたはマーケティングの専門家です。
以下の商品分析結果に基づき、最適なターゲットペルソナを生成してください。

商品分析:
${analysisText}

【必須】日本語でペルソナを生成してください。日本人の名前を使用してください。
名前の例: 美咲、遥、さくら、あかり、ゆい

以下の形式でJSON出力してください:
{
  "name": "日本人の名前（例: 美咲）",
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
    }

    // Non-Japanese languages
    return `You are a marketing expert specializing in creating target personas for UGC advertisements.

Based on the following product analysis, generate an optimal target persona.

Product Analysis:
${analysisText}

【CRITICAL LANGUAGE REQUIREMENT】
${langInstructions.personaLang}
Name example: ${langInstructions.nameExample}

Output in the following JSON format:
{
  "name": "Persona name (use a name appropriate for the target language/culture)",
  "age": age (number),
  "occupation": "Occupation",
  "personality": ["trait1", "trait2", "trait3"],
  "speakingStyle": "Speaking style description",
  "painPoints": ["pain point 1", "pain point 2"],
  "lifestyle": "Lifestyle description"
}

Requirements:
- Create a realistic persona based on the target audience and product features
- The persona should feel like a natural UGC creator
- Someone who casually introduces products to friends via smartphone`;
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
    const lang = this.options.language || 'ja';
    const langInstructions = LANGUAGE_INSTRUCTIONS[lang];

    // Create fully language-aware prompt - Japanese version is completely in Japanese
    if (lang === 'ja') {
      return `あなたはUGC広告のスクリプトライターです。

以下のペルソナと商品情報に基づき、12秒のUGC広告スクリプトを作成してください。

ペルソナ:
${personaText}

商品分析:
${analysisText}

【絶対厳守 - narrationは100%日本語で書くこと】
${langInstructions.scriptLang}
${langInstructions.example}

narrationフィールドには絶対に英語を使わないでください。日本語のみで書いてください。

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
      "narration": "ここに日本語のセリフを書く（例: ねぇねぇ、これ見て！）",
      "emotion": "感情トーン（例: excited, calm, confident）",
      "cameraDirection": "カメラワーク（例: close-up, medium shot）",
      "visualDescription": "映像の詳細な描写"
    }
  ],
  "sora2Prompt": "動画生成プロンプト"
}

【重要な注意事項】
- narrationは必ず日本語で書くこと！英語禁止！
- 例: 「ねぇねぇ、これ見て！」「マジでこれいいよ！」「めっちゃ使いやすいの！」
- visualDescriptionとsora2Promptも日本語で書いてOK
- 商品の特徴を自然に織り込む
- 本物のUGCのような親しみやすいトーンで

【sora2Prompt作成ガイド - 超重要】
必ず以下の要素を含めること:
- 国籍: ${langInstructions.nationality} (必須！)
- 外見: ${langInstructions.ethnicDescription}
- 場所: ${langInstructions.locationExample}
- スタイル: スマホで自撮りしながら商品を紹介するUGC風
- 雰囲気: 自然光、カジュアルな服装、親しみやすい

sora2Promptの例:
「A young ${langInstructions.ethnicDescription} in her late 20s, holding a skincare product in her ${langInstructions.locationExample}, filming herself with her smartphone in a casual UGC style. Natural lighting, casual white t-shirt, friendly and approachable atmosphere.」

絶対に「${langInstructions.nationality} woman」をプロンプトに含めること！`;
    }

    // Non-Japanese languages
    return `You are a UGC advertisement scriptwriter.

Create a 12-second UGC advertisement script based on the following persona and product information.

Persona:
${personaText}

Product Analysis:
${analysisText}

【CRITICAL - NARRATION LANGUAGE REQUIREMENT】
${langInstructions.scriptLang}
${langInstructions.example}

ALL "narration" fields MUST be written in the language specified above. Do NOT use any other language for narration.

【Requirements】
- Total video duration: 12 seconds
- Divide into 3-4 scenes
- Natural, casual tone like introducing a product to a friend via smartphone
- First scene: Product introduction/reveal
- Last scene: Usage impression and recommendation
- Include emotion tone, camera direction, and visual description for each scene

Output in the following JSON format:
{
  "totalDuration": 12,
  "scenes": [
    {
      "sceneNumber": 1,
      "timeCode": "00:00-00:03",
      "durationSeconds": 3,
      "narration": "${langInstructions.narrationLabel}",
      "emotion": "emotion tone (e.g., excited, calm, confident)",
      "cameraDirection": "camera direction (e.g., close-up, medium shot, overhead)",
      "visualDescription": "Detailed visual description for Sora2 (always in English)"
    }
  ],
  "sora2Prompt": "Integrated Sora2 video generation prompt (always in English)"
}

IMPORTANT REMINDERS:
- The "narration" field MUST be in the target language: ${lang === 'en' ? 'English' : 'Chinese (中文)'}
- Example narration style: ${langInstructions.example}
- The "visualDescription" and "sora2Prompt" should always be in English for Sora2 compatibility
- Naturally incorporate product features into the narration
- Keep the tone authentic and relatable

【CRITICAL - sora2Prompt NATIONALITY REQUIREMENT】
The sora2Prompt MUST feature a ${langInstructions.nationality} woman:
- Nationality: ${langInstructions.nationality} (REQUIRED!)
- Appearance: ${langInstructions.ethnicDescription}
- Location: ${langInstructions.locationExample}
- Style: UGC-style smartphone selfie video introducing a product
- Atmosphere: Natural lighting, casual clothing, friendly and approachable

Example sora2Prompt:
"A young ${langInstructions.ethnicDescription} in her late 20s, holding a skincare product in her ${langInstructions.locationExample}, filming herself with her smartphone in a casual UGC style. Natural lighting, casual white t-shirt, friendly and approachable atmosphere."

YOU MUST include "${langInstructions.nationality} woman" in the sora2Prompt!`;
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

      // Get sora2Prompt from API response or generate fallback
      let sora2Prompt = String(parsed.sora2Prompt || '');

      // If sora2Prompt is empty, generate from scenes
      if (!sora2Prompt || sora2Prompt.trim() === '') {
        console.log('⚠️ [ScriptGenerator] sora2Prompt empty, generating from scenes...');
        sora2Prompt = this.generateSora2PromptFromScenes(scenes, this.options.language);
        console.log(`📝 [ScriptGenerator] Generated sora2Prompt: ${sora2Prompt.substring(0, 100)}...`);
      }

      return {
        totalDuration: 12,
        scenes,
        sora2Prompt,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse script response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate sora2Prompt from scenes as fallback
   */
  private generateSora2PromptFromScenes(scenes: UGCScript['scenes'], language: 'ja' | 'en' | 'zh'): string {
    const langConfig = {
      ja: {
        nationality: 'Japanese',
        ethnicity: 'Japanese woman with black hair',
        location: 'bright modern apartment in Tokyo',
      },
      en: {
        nationality: 'American',
        ethnicity: 'American woman',
        location: 'bright modern apartment in Los Angeles',
      },
      zh: {
        nationality: 'Chinese',
        ethnicity: 'Chinese woman with long black hair',
        location: 'bright modern apartment in Shanghai',
      },
    };

    const config = langConfig[language];

    // Combine visualDescriptions from scenes
    const visualElements = scenes
      .map(scene => scene.visualDescription)
      .filter(desc => desc && desc.length > 0)
      .join(' ');

    // Generate a comprehensive Sora 2 prompt
    return `A ${config.ethnicity} in her early 30s in a ${config.location}, creating an authentic UGC-style video. ${visualElements}. The lighting is warm and natural, shot in vertical 9:16 format for social media. Smooth camera movements, authentic and relatable content creation style.`;
  }

  /**
   * Delay utility for retry backoff
   *
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Mock persona generation for testing
   *
   * @param analysis - Product analysis
   * @returns Mock persona
   */
  private generatePersonaMock(_analysis: ProductAnalysis): Persona {
    return {
      name: '美咲',
      age: 28,
      occupation: 'IT企業勤務（マーケティング担当）',
      personality: ['明るい', '社交的', '美容好き'],
      speakingStyle: '友達に話すようなカジュアルで親しみやすい口調',
      painPoints: ['忙しくて時短コスメが欲しい', '自然な仕上がりを求めている'],
      lifestyle: '仕事が忙しいが、美容には気を使いたい。週末はカフェ巡りが趣味。',
    };
  }

  /**
   * Mock script generation for testing
   *
   * @param _persona - Target persona
   * @param _analysis - Product analysis
   * @returns Mock UGC script
   */
  private generateScriptMock(_persona: Persona, _analysis: ProductAnalysis): UGCScript {
    return {
      totalDuration: 12,
      scenes: [
        {
          sceneNumber: 1,
          timeCode: '00:00-00:03',
          durationSeconds: 3,
          narration: 'ねぇねぇ、これ見て!最近買った新しいリップ!',
          emotion: 'excited',
          cameraDirection: 'close-up',
          visualDescription: 'Young woman holding a coral pink lipstick, excited expression, bright lighting',
        },
        {
          sceneNumber: 2,
          timeCode: '00:03-00:07',
          durationSeconds: 4,
          narration: '色がめっちゃ綺麗でしょ?コーラルピンクで、肌なじみがすごくいいの',
          emotion: 'confident',
          cameraDirection: 'medium shot',
          visualDescription: 'Close-up of the lipstick being applied, showing the coral pink color',
        },
        {
          sceneNumber: 3,
          timeCode: '00:07-00:10',
          durationSeconds: 3,
          narration: '保湿成分も入ってるから、一日中うるおうよ',
          emotion: 'calm',
          cameraDirection: 'close-up',
          visualDescription: 'Woman smiling, showing the finished lip makeup, natural lighting',
        },
        {
          sceneNumber: 4,
          timeCode: '00:10-00:12',
          durationSeconds: 2,
          narration: 'これはマジでおすすめ!',
          emotion: 'excited',
          cameraDirection: 'medium shot',
          visualDescription: 'Woman giving thumbs up, happy expression, product visible',
        },
      ],
      sora2Prompt:
        'A young professional woman in her late 20s creates a UGC-style video about a coral pink lipstick. The video starts with her excitedly holding the lipstick in close-up, then shows her applying it while explaining its beautiful color and skin-friendly properties. The video has natural, casual lighting and a friendly, authentic vibe. She concludes with a confident recommendation, giving a thumbs up. The entire video is shot in a modern, minimalist setting with soft, warm lighting.',
    };
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
