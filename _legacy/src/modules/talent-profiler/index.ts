/**
 * TalentProfiler Module
 * Generates talent profiles for video persona using Gemini API
 *
 * This module creates:
 * - Appearance details (face, hair, body, fashion)
 * - Personality traits (speaking style, tone)
 * - Sora2 video prompt hints in English
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Talent profile including appearance and personality
 */
export interface TalentProfile {
  /** Talent name */
  name: string;
  /** Appearance characteristics */
  appearance: {
    /** Face type (e.g., round, oval, beautiful) */
    faceType: string;
    /** Hair style (e.g., long straight, short bob) */
    hairStyle: string;
    /** Body type (e.g., slim, average) */
    bodyType: string;
    /** Fashion style (e.g., casual, elegant) */
    fashionStyle: string;
  };
  /** Personality traits */
  personality: {
    /** Speaking style (e.g., soft, energetic) */
    speakingStyle: string;
    /** Voice tone (e.g., gentle, bright) */
    tone: string;
    /** Optional catchphrase */
    catchphrase?: string;
  };
  /** Video prompt hints for Sora2 (in English) */
  videoPromptHints: string;
}

/**
 * Configuration options for TalentProfiler
 */
export interface TalentProfilerOptions {
  /** Google Gemini API key */
  geminiApiKey?: string;
  /** Gemini model to use (default: gemini-2.0-flash-exp) */
  geminiModel?: string;
  /** Maximum retry attempts on failure */
  maxRetries?: number;
  /** Use mock implementation (for testing) */
  useMock?: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_OPTIONS: Required<Omit<TalentProfilerOptions, 'geminiApiKey'>> = {
  geminiModel: 'gemini-2.0-flash-exp',
  maxRetries: 3,
  useMock: false,
};

/**
 * System prompt for talent profile generation
 */
const PROFILE_GENERATION_PROMPT = `あなたは芸能界の専門家です。
以下のタレント名に基づき、その人物の外見的特徴と性格的特徴を分析してください。

タレント名: {TALENT_NAME}
出力言語: {LANGUAGE}

以下の形式でJSON出力してください:
{
  "name": "タレント名",
  "appearance": {
    "faceType": "顔立ち（例: 丸顔、卵型、美人系、端正な顔立ち）",
    "hairStyle": "髪型（例: ロングストレート、ショートボブ、ミディアムウェーブ）",
    "bodyType": "体型（例: スリム、標準、グラマラス）",
    "fashionStyle": "ファッションスタイル（例: カジュアル、エレガント、ナチュラル、モダン）"
  },
  "personality": {
    "speakingStyle": "話し方（例: 柔らかい、ハキハキ、落ち着いた、明るい）",
    "tone": "声のトーン（例: 優しい、明るい、クール、温かい）",
    "catchphrase": "キャッチフレーズ（オプション、あれば記載）"
  },
  "videoPromptHints": "Sora2用の動画生成プロンプトヒント（英語で、外見的特徴を詳細に記述）"
}

注意:
- 公開情報に基づいた客観的な特徴分析を行う
- videoPromptHintsは必ず英語で記述すること
- videoPromptHintsには外見的特徴を具体的に含めること（顔立ち、髪型、体型、ファッションスタイル）
- プライバシーに配慮し、公開されている情報のみを使用`;

/**
 * TalentProfiler class
 * Generates talent profiles using Gemini API with caching
 */
export class TalentProfiler {
  private options: Required<TalentProfilerOptions>;
  private gemini?: GoogleGenerativeAI;
  private useMock: boolean;
  private cache: Map<string, TalentProfile>;

  constructor(options: TalentProfilerOptions = {}) {
    this.useMock = options.useMock || false;
    this.cache = new Map();

    // Merge with defaults
    this.options = {
      ...DEFAULT_OPTIONS,
      geminiApiKey: options.geminiApiKey || process.env.GEMINI_API_KEY,
      useMock: this.useMock,
      ...options,
    } as Required<TalentProfilerOptions>;

    // Skip API key validation in mock mode
    if (this.useMock) {
      return;
    }

    // Initialize Gemini client if API key is available
    if (this.options.geminiApiKey) {
      this.gemini = new GoogleGenerativeAI(this.options.geminiApiKey);
    } else {
      throw new Error('TalentProfiler requires GEMINI_API_KEY');
    }
  }

  /**
   * Generate talent profile from talent name
   *
   * @param talentName - Name of the talent (e.g., "新垣結衣")
   * @param language - Output language (default: "ja")
   * @returns Generated talent profile
   * @throws Error if generation fails after all retries
   */
  async generateProfile(talentName: string, language: string = 'ja'): Promise<TalentProfile> {
    // Check cache first
    const cacheKey = `${talentName}:${language}`;
    if (this.cache.has(cacheKey)) {
      console.log(`[TalentProfiler] Using cached profile for ${talentName}`);
      return this.cache.get(cacheKey)!;
    }

    // Return mock data if in mock mode
    if (this.useMock) {
      const mockProfile = this.generateProfileMock(talentName, language);
      this.cache.set(cacheKey, mockProfile);
      return mockProfile;
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        const prompt = this.buildProfilePrompt(talentName, language);
        const profile = await this.generateWithGemini(prompt);

        // Cache the result
        this.cache.set(cacheKey, profile);

        return profile;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.options.maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`[TalentProfiler] Retry attempt ${attempt} after ${delayMs}ms...`);
          await this.delay(delayMs);
          continue;
        }
        break;
      }
    }

    throw new Error(
      `Talent profile generation failed after ${this.options.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Clear cache for a specific talent or all cache
   *
   * @param talentName - Optional talent name to clear specific cache
   */
  clearCache(talentName?: string): void {
    if (talentName) {
      // Clear all language variants for this talent
      for (const key of this.cache.keys()) {
        if (key.startsWith(talentName + ':')) {
          this.cache.delete(key);
        }
      }
      console.log(`[TalentProfiler] Cleared cache for ${talentName}`);
    } else {
      this.cache.clear();
      console.log('[TalentProfiler] Cleared all cache');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Generate content using Gemini API
   */
  private async generateWithGemini(prompt: string): Promise<TalentProfile> {
    if (!this.gemini) {
      throw new Error('Gemini client not initialized');
    }

    const model = this.gemini.getGenerativeModel({ model: this.options.geminiModel });

    const systemPrompt = 'You are an entertainment industry expert specializing in talent analysis. Return only valid JSON.';

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

    return this.parseProfileResponse(jsonString);
  }

  /**
   * Build profile generation prompt
   *
   * @param talentName - Talent name
   * @param language - Output language
   * @returns Formatted prompt string
   */
  private buildProfilePrompt(talentName: string, language: string): string {
    return PROFILE_GENERATION_PROMPT
      .replace('{TALENT_NAME}', talentName)
      .replace('{LANGUAGE}', language);
  }

  /**
   * Parse and validate profile JSON response
   *
   * @param content - Raw JSON string from API
   * @returns TalentProfile object
   */
  private parseProfileResponse(content: string): TalentProfile {
    try {
      const parsed = JSON.parse(content);

      // Validate required fields
      return {
        name: String(parsed.name || ''),
        appearance: {
          faceType: String(parsed.appearance?.faceType || ''),
          hairStyle: String(parsed.appearance?.hairStyle || ''),
          bodyType: String(parsed.appearance?.bodyType || ''),
          fashionStyle: String(parsed.appearance?.fashionStyle || ''),
        },
        personality: {
          speakingStyle: String(parsed.personality?.speakingStyle || ''),
          tone: String(parsed.personality?.tone || ''),
          catchphrase: parsed.personality?.catchphrase ? String(parsed.personality.catchphrase) : undefined,
        },
        videoPromptHints: String(parsed.videoPromptHints || ''),
      };
    } catch (error) {
      throw new Error(
        `Failed to parse profile response: ${error instanceof Error ? error.message : String(error)}`
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

  /**
   * Mock profile generation for testing
   *
   * @param talentName - Talent name
   * @param language - Output language
   * @returns Mock talent profile
   */
  private generateProfileMock(talentName: string, language: string): TalentProfile {
    // Special case for 新垣結衣
    if (talentName === '新垣結衣' || talentName === 'Aragaki Yui') {
      return {
        name: '新垣結衣',
        appearance: {
          faceType: '美人系、卵型の整った顔立ち',
          hairStyle: 'ロングストレート、ミディアムヘア',
          bodyType: 'スリム',
          fashionStyle: 'ナチュラル、カジュアルエレガント',
        },
        personality: {
          speakingStyle: '柔らかく優しい、親しみやすい',
          tone: '温かい、落ち着いた',
          catchphrase: '「逃げ恥」ムズキュンダンス',
        },
        videoPromptHints: 'A young Japanese woman with an oval-shaped beautiful face, long straight hair, slim body type, dressed in natural casual-elegant fashion. She has a gentle, warm speaking style with a friendly and approachable tone. Natural lighting, soft atmosphere, authentic and relatable presence.',
      };
    }

    // Generic mock for other talents
    return {
      name: talentName,
      appearance: {
        faceType: language === 'ja' ? '整った顔立ち' : 'Well-balanced facial features',
        hairStyle: language === 'ja' ? 'ミディアムヘア' : 'Medium-length hair',
        bodyType: language === 'ja' ? '標準' : 'Average',
        fashionStyle: language === 'ja' ? 'カジュアル' : 'Casual',
      },
      personality: {
        speakingStyle: language === 'ja' ? '親しみやすい' : 'Friendly',
        tone: language === 'ja' ? '明るい' : 'Bright',
        catchphrase: undefined,
      },
      videoPromptHints: `A ${language === 'ja' ? 'Japanese' : 'talented'} person with well-balanced facial features, medium-length hair, average body type, dressed in casual fashion. Friendly speaking style with a bright tone. Natural and approachable presence.`,
    };
  }
}

/**
 * Factory function to create TalentProfiler instance
 *
 * @param options - Configuration options
 * @returns New TalentProfiler instance
 */
export function createTalentProfiler(options?: TalentProfilerOptions): TalentProfiler {
  return new TalentProfiler(options);
}
