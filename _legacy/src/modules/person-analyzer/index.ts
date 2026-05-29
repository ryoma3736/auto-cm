/**
 * Person Analyzer Module
 * AI-powered person image analysis using Gemini Vision API
 *
 * Analyzes person images and extracts:
 * - Estimated age and gender
 * - Facial features and expressions
 * - Suggested persona for CM
 * - Voice characteristics
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gender type
 */
export type Gender = 'male' | 'female' | 'other';

/**
 * Age group for targeting
 */
export type AgeGroup = '10s' | '20s' | '30s' | '40s' | '50s' | '60+';

/**
 * Person profile extracted from image
 */
export interface PersonProfile {
  /** Estimated age */
  estimatedAge: number;
  /** Age group for targeting */
  ageGroup: AgeGroup;
  /** Gender */
  gender: Gender;
  /** Facial features description */
  facialFeatures: string;
  /** Expression and mood */
  expression: string;
  /** Hair style description */
  hairStyle: string;
  /** Clothing style description */
  clothingStyle: string;
  /** Suggested persona name */
  suggestedPersonaName: string;
  /** Suggested persona description */
  suggestedPersonaDescription: string;
  /** Voice characteristics for TTS */
  voiceCharacteristics: {
    /** Voice tone (bright, calm, energetic, etc.) */
    tone: string;
    /** Speaking style (casual, formal, friendly, etc.) */
    style: string;
    /** Recommended voice type for TTS */
    recommendedVoice: 'nova' | 'alloy' | 'echo' | 'fable' | 'onyx' | 'shimmer';
  };
  /** Raw description from AI */
  rawDescription: string;
}

/**
 * Person analysis request
 */
export interface PersonAnalysisRequest {
  /** Person image in Base64 */
  personImage: string;
  /** Language for response */
  language: 'ja' | 'en' | 'zh';
}

/**
 * Configuration options
 */
export interface PersonAnalyzerOptions {
  /** Gemini API key */
  geminiApiKey?: string;
  /** Gemini model to use */
  geminiModel?: string;
  /** Maximum retries */
  maxRetries?: number;
  /** Use mock implementation */
  useMock?: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_OPTIONS = {
  geminiModel: 'gemini-2.0-flash-exp',
  maxRetries: 3,
  useMock: false,
};

/**
 * Analysis prompt for person images
 */
const PERSON_ANALYSIS_PROMPT = `あなたはCMキャスティングの専門家です。
この人物画像を分析し、以下の情報をJSON形式で抽出してください：

1. estimatedAge: 推定年齢（数値）
2. ageGroup: 年齢層（"10s", "20s", "30s", "40s", "50s", "60+"のいずれか）
3. gender: 性別（"male", "female", "other"のいずれか）
4. facialFeatures: 顔の特徴（例: "目が大きく、柔らかい印象"）
5. expression: 表情・雰囲気（例: "明るく親しみやすい笑顔"）
6. hairStyle: 髪型の説明（例: "黒髪のセミロング、ナチュラルなストレート"）
7. clothingStyle: 服装の説明（例: "カジュアルな白のブラウス"）
8. suggestedPersonaName: CM向けの推奨ペルソナ名（例: "佐藤 美咲"）
9. suggestedPersonaDescription: ペルソナの詳細説明（職業、ライフスタイルなど）
10. voiceCharacteristics: 声の特性
    - tone: 声のトーン（"bright", "calm", "energetic", "warm", "cool"）
    - style: 話し方（"casual", "formal", "friendly", "professional"）
    - recommendedVoice: TTS用推奨ボイス（"nova", "alloy", "echo", "fable", "onyx", "shimmer"）
11. rawDescription: 画像の詳細な説明文

必ず有効なJSON形式で返答してください。`;

/**
 * PersonAnalyzer class
 * Analyzes person images for CM casting
 */
export class PersonAnalyzer {
  private options: typeof DEFAULT_OPTIONS & { geminiApiKey?: string };
  private gemini?: GoogleGenerativeAI;
  private useMock: boolean;

  constructor(options: PersonAnalyzerOptions = {}) {
    this.useMock = options.useMock ?? false;

    this.options = {
      ...DEFAULT_OPTIONS,
      geminiApiKey: options.geminiApiKey || process.env.GEMINI_API_KEY,
      ...options,
    };

    if (this.useMock) {
      return;
    }

    if (this.options.geminiApiKey) {
      this.gemini = new GoogleGenerativeAI(this.options.geminiApiKey);
    } else {
      throw new Error('PersonAnalyzer requires GEMINI_API_KEY');
    }
  }

  /**
   * Analyze a person image
   */
  async analyze(request: PersonAnalysisRequest): Promise<PersonProfile> {
    if (this.useMock) {
      return this.analyzeMock(request);
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await this.analyzeWithGemini(request);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.options.maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          await this.delay(delayMs);
          continue;
        }
      }
    }

    throw new Error(
      `Person analysis failed after ${this.options.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Analyze using Gemini Vision
   */
  private async analyzeWithGemini(request: PersonAnalysisRequest): Promise<PersonProfile> {
    if (!this.gemini) {
      throw new Error('Gemini client not initialized');
    }

    console.log('👤 [PersonAnalyzer] Analyzing person image with Gemini Vision...');

    const model = this.gemini.getGenerativeModel({ model: this.options.geminiModel });

    const languagePrompt = request.language === 'ja'
      ? PERSON_ANALYSIS_PROMPT
      : request.language === 'en'
        ? this.getEnglishPrompt()
        : this.getChinesePrompt();

    const response = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: request.personImage,
        },
      },
      {
        text: languagePrompt + '\n\nJSON形式のみで返答してください。',
      },
    ]);

    const content = response.response.text();
    if (!content) {
      throw new Error('No response from Gemini Vision API');
    }

    return this.parseResponse(content);
  }

  /**
   * English analysis prompt
   */
  private getEnglishPrompt(): string {
    return `You are a CM casting specialist.
Analyze this person image and extract the following information in JSON format:

1. estimatedAge: Estimated age (number)
2. ageGroup: Age group ("10s", "20s", "30s", "40s", "50s", "60+")
3. gender: Gender ("male", "female", "other")
4. facialFeatures: Facial features description
5. expression: Expression and mood
6. hairStyle: Hair style description
7. clothingStyle: Clothing style description
8. suggestedPersonaName: Suggested persona name for CM
9. suggestedPersonaDescription: Persona description (occupation, lifestyle)
10. voiceCharacteristics: Voice characteristics
    - tone: Voice tone ("bright", "calm", "energetic", "warm", "cool")
    - style: Speaking style ("casual", "formal", "friendly", "professional")
    - recommendedVoice: Recommended TTS voice ("nova", "alloy", "echo", "fable", "onyx", "shimmer")
11. rawDescription: Detailed image description

Return only valid JSON format.`;
  }

  /**
   * Chinese analysis prompt
   */
  private getChinesePrompt(): string {
    return `你是广告选角专家。
分析这张人物图片，以JSON格式提取以下信息：

1. estimatedAge: 预估年龄（数字）
2. ageGroup: 年龄段（"10s", "20s", "30s", "40s", "50s", "60+"）
3. gender: 性别（"male", "female", "other"）
4. facialFeatures: 面部特征描述
5. expression: 表情和气质
6. hairStyle: 发型描述
7. clothingStyle: 服装风格描述
8. suggestedPersonaName: 建议的广告人设名称
9. suggestedPersonaDescription: 人设描述（职业、生活方式）
10. voiceCharacteristics: 声音特征
    - tone: 声音调性（"bright", "calm", "energetic", "warm", "cool"）
    - style: 说话风格（"casual", "formal", "friendly", "professional"）
    - recommendedVoice: 推荐TTS声音（"nova", "alloy", "echo", "fable", "onyx", "shimmer"）
11. rawDescription: 详细图片描述

仅返回有效的JSON格式。`;
  }

  /**
   * Parse JSON response
   */
  private parseResponse(content: string): PersonProfile {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;

      const parsed = JSON.parse(jsonString);

      return {
        estimatedAge: Number(parsed.estimatedAge) || 25,
        ageGroup: this.validateAgeGroup(parsed.ageGroup),
        gender: this.validateGender(parsed.gender),
        facialFeatures: String(parsed.facialFeatures || ''),
        expression: String(parsed.expression || ''),
        hairStyle: String(parsed.hairStyle || ''),
        clothingStyle: String(parsed.clothingStyle || ''),
        suggestedPersonaName: String(parsed.suggestedPersonaName || 'Unknown'),
        suggestedPersonaDescription: String(parsed.suggestedPersonaDescription || ''),
        voiceCharacteristics: {
          tone: String(parsed.voiceCharacteristics?.tone || 'warm'),
          style: String(parsed.voiceCharacteristics?.style || 'friendly'),
          recommendedVoice: this.validateVoice(parsed.voiceCharacteristics?.recommendedVoice),
        },
        rawDescription: String(parsed.rawDescription || ''),
      };
    } catch (error) {
      throw new Error(
        `Failed to parse person analysis response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate age group
   */
  private validateAgeGroup(ageGroup: unknown): AgeGroup {
    const validGroups: AgeGroup[] = ['10s', '20s', '30s', '40s', '50s', '60+'];
    const groupStr = String(ageGroup);
    return validGroups.includes(groupStr as AgeGroup) ? (groupStr as AgeGroup) : '30s';
  }

  /**
   * Validate gender
   */
  private validateGender(gender: unknown): Gender {
    const validGenders: Gender[] = ['male', 'female', 'other'];
    const genderStr = String(gender).toLowerCase();
    return validGenders.includes(genderStr as Gender) ? (genderStr as Gender) : 'other';
  }

  /**
   * Validate voice
   */
  private validateVoice(voice: unknown): PersonProfile['voiceCharacteristics']['recommendedVoice'] {
    const validVoices = ['nova', 'alloy', 'echo', 'fable', 'onyx', 'shimmer'] as const;
    const voiceStr = String(voice).toLowerCase();
    return validVoices.includes(voiceStr as typeof validVoices[number])
      ? (voiceStr as typeof validVoices[number])
      : 'nova';
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Mock implementation
   */
  private analyzeMock(request: PersonAnalysisRequest): PersonProfile {
    console.log('👤 [PersonAnalyzer] MOCK: Analyzing person image');

    const isJapanese = request.language === 'ja';

    return {
      estimatedAge: 28,
      ageGroup: '20s',
      gender: 'female',
      facialFeatures: isJapanese
        ? '目が大きく、柔らかい印象の顔立ち'
        : 'Large eyes with a soft facial impression',
      expression: isJapanese
        ? '明るく親しみやすい笑顔'
        : 'Bright and friendly smile',
      hairStyle: isJapanese
        ? '黒髪のセミロング、ナチュラルなストレート'
        : 'Semi-long black hair, natural straight',
      clothingStyle: isJapanese
        ? 'カジュアルで清潔感のある服装'
        : 'Casual and clean clothing style',
      suggestedPersonaName: isJapanese ? '田中 美咲' : 'Misa Tanaka',
      suggestedPersonaDescription: isJapanese
        ? '28歳、IT企業勤務のマーケティング担当。健康志向で、週末はヨガやランニングを楽しむ。'
        : '28 years old, marketing professional at an IT company. Health-conscious, enjoys yoga and running on weekends.',
      voiceCharacteristics: {
        tone: 'bright',
        style: 'friendly',
        recommendedVoice: 'nova',
      },
      rawDescription: isJapanese
        ? '20代後半の女性。明るい表情で、親しみやすい雰囲気を持つ。清潔感のある外見で、ビジネスカジュアルな服装。'
        : 'Late 20s woman. Bright expression with a friendly atmosphere. Clean appearance with business casual attire.',
    };
  }
}

/**
 * Factory function
 */
export function createPersonAnalyzer(options?: PersonAnalyzerOptions): PersonAnalyzer {
  return new PersonAnalyzer(options);
}
