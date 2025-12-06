/**
 * Vision Analyzer Module
 * AI-powered cosmetics product image analysis using Gemini, OpenAI Vision, and Claude Vision APIs
 *
 * This module analyzes cosmetic product images and extracts:
 * - Product type and name
 * - Color palette
 * - Product features and selling points
 * - Target audience
 * - Mood and brand style
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Supported cosmetic product types
 */
export type ProductType = 'lipstick' | 'foundation' | 'perfume' | 'skincare' | 'other';

/**
 * Structured analysis result for cosmetic products
 */
export interface ProductAnalysis {
  /** Product category */
  productType: ProductType;
  /** Predicted product name or description */
  productName: string;
  /** Array of color descriptions (e.g., ['coral pink', 'nude beige']) */
  colors: string[];
  /** Product features and selling points */
  features: string[];
  /** Target audience description */
  targetAudience: string;
  /** Mood and image keywords (e.g., ['elegant', 'youthful', 'natural']) */
  mood: string[];
  /** Brand style and positioning */
  brandStyle: string;
  /** Raw AI-generated description */
  rawDescription: string;
}

/**
 * Configuration options for VisionAnalyzer
 */
export interface VisionAnalyzerOptions {
  /** OpenAI API key */
  openaiApiKey?: string;
  /** Claude API key */
  claudeApiKey?: string;
  /** Google Gemini API key (preferred) */
  geminiApiKey?: string;
  /** OpenAI model to use (default: gpt-4o) */
  openaiModel?: string;
  /** Claude model to use (default: claude-3-5-sonnet-20241022) */
  claudeModel?: string;
  /** Gemini model to use (default: gemini-2.0-flash-exp) */
  geminiModel?: string;
  /** Maximum retry attempts on failure */
  maxRetries?: number;
  /** Use Claude as primary provider instead of OpenAI */
  useClaudePrimary?: boolean;
  /** Use Gemini as primary provider (overrides useClaudePrimary) */
  useGeminiPrimary?: boolean;
  /** Use mock implementation (for testing) */
  useMock?: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_OPTIONS: Required<Omit<VisionAnalyzerOptions, 'openaiApiKey' | 'claudeApiKey' | 'geminiApiKey'>> = {
  openaiModel: 'gpt-4o',
  claudeModel: 'claude-3-5-sonnet-20241022',
  geminiModel: 'gemini-2.0-flash-exp',
  maxRetries: 3,
  useClaudePrimary: false,
  useGeminiPrimary: true, // Gemini is now the default primary provider
  useMock: false,
};

/**
 * System prompt for cosmetic product analysis
 */
const ANALYSIS_PROMPT = `あなたは化粧品マーケティングの専門家です。
この商品画像を分析し、以下の情報をJSON形式で抽出してください：

1. productType: 商品カテゴリ（"lipstick", "foundation", "perfume", "skincare", "other"のいずれか）
2. productName: 推測される商品名または詳細な説明
3. colors: 色味の配列（例: ["コーラルピンク", "ヌードベージュ"]）
4. features: 商品の特徴・セールスポイントの配列（例: ["保湿成分配合", "長時間持続"]）
5. targetAudience: ターゲット層の説明（例: "20-30代の働く女性"）
6. mood: 雰囲気・イメージの配列（例: ["エレガント", "ナチュラル", "高級感"]）
7. brandStyle: ブランドイメージの説明（例: "高級感とモダンさを兼ね備えたブランド"）
8. rawDescription: 画像の詳細な説明文

必ず有効なJSON形式で返答してください。フィールドが特定できない場合は空の配列や"不明"を使用してください。`;

/**
 * Vision Analyzer for cosmetic product images
 * Supports Gemini Vision, OpenAI Vision, and Claude Vision APIs
 */
export class VisionAnalyzer {
  private options: Required<VisionAnalyzerOptions>;
  private openai?: OpenAI;
  private claude?: Anthropic;
  private gemini?: GoogleGenerativeAI;
  private useMock: boolean;

  constructor(options: VisionAnalyzerOptions = {}) {
    this.useMock = options.useMock || false;

    // Merge with defaults
    this.options = {
      ...DEFAULT_OPTIONS,
      openaiApiKey: options.openaiApiKey || process.env.OPENAI_API_KEY,
      claudeApiKey: options.claudeApiKey || process.env.ANTHROPIC_API_KEY,
      geminiApiKey: options.geminiApiKey || process.env.GEMINI_API_KEY,
      useMock: this.useMock,
      ...options,
    } as Required<VisionAnalyzerOptions>;

    // Skip API key validation in mock mode
    if (this.useMock) {
      return;
    }

    // Initialize Gemini client if API key is available (preferred)
    if (this.options.geminiApiKey) {
      this.gemini = new GoogleGenerativeAI(this.options.geminiApiKey);
    }

    // Initialize OpenAI client if API key is available
    if (this.options.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.options.openaiApiKey,
      });
    }

    // Initialize Claude client if API key is available
    if (this.options.claudeApiKey) {
      this.claude = new Anthropic({
        apiKey: this.options.claudeApiKey,
      });
    }

    // Validate that at least one provider is configured
    if (!this.gemini && !this.openai && !this.claude) {
      throw new Error(
        'VisionAnalyzer requires at least one API key (GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY)'
      );
    }
  }

  /**
   * Analyze a cosmetic product image
   *
   * @param imageBase64 - Base64-encoded image string (without data URI prefix)
   * @returns ProductAnalysis with structured data
   * @throws Error if analysis fails after all retries
   */
  async analyze(imageBase64: string): Promise<ProductAnalysis> {
    // Return mock data if in mock mode
    if (this.useMock) {
      return this.analyzeMock(imageBase64);
    }

    let lastError: Error | null = null;

    // Retry loop
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        // Try Gemini first if available and preferred (default)
        if (this.options.useGeminiPrimary && this.gemini) {
          try {
            return await this.analyzeWithGemini(imageBase64);
          } catch (geminiError) {
            lastError = geminiError instanceof Error ? geminiError : new Error(String(geminiError));
            console.log(`Gemini Vision failed, trying fallback: ${lastError.message}`);
            // Fallback to OpenAI or Claude
            if (this.openai) {
              return await this.analyzeWithOpenAI(imageBase64);
            } else if (this.claude) {
              return await this.analyzeWithClaude(imageBase64);
            }
            throw geminiError;
          }
        }

        // Determine primary and fallback providers for non-Gemini mode
        const primaryProvider = this.options.useClaudePrimary ? 'claude' : 'openai';
        const fallbackProvider = this.options.useClaudePrimary ? 'openai' : 'claude';

        // Try primary provider first
        if (primaryProvider === 'openai' && this.openai) {
          try {
            return await this.analyzeWithOpenAI(imageBase64);
          } catch (primaryError) {
            lastError = primaryError instanceof Error ? primaryError : new Error(String(primaryError));
            // If fallback is available, try it
            if (fallbackProvider === 'claude' && this.claude) {
              return await this.analyzeWithClaude(imageBase64);
            }
            throw primaryError;
          }
        } else if (primaryProvider === 'claude' && this.claude) {
          try {
            return await this.analyzeWithClaude(imageBase64);
          } catch (primaryError) {
            lastError = primaryError instanceof Error ? primaryError : new Error(String(primaryError));
            // If fallback is available, try it
            if (fallbackProvider === 'openai' && this.openai) {
              return await this.analyzeWithOpenAI(imageBase64);
            }
            throw primaryError;
          }
        }

        throw new Error('No available vision API provider');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.options.maxRetries) {
          // Exponential backoff: 1s, 2s, 4s, ...
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          await this.delay(delayMs);
          continue;
        }

        // Final attempt failed
        break;
      }
    }

    throw new Error(
      `Vision analysis failed after ${this.options.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Analyze image using OpenAI Vision API
   *
   * @param imageBase64 - Base64-encoded image
   * @returns ProductAnalysis
   */
  private async analyzeWithOpenAI(imageBase64: string): Promise<ProductAnalysis> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openai.chat.completions.create({
      model: this.options.openaiModel,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: ANALYSIS_PROMPT,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
      temperature: 0.3, // Lower temperature for more consistent results
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI Vision API');
    }

    return this.parseAnalysisResponse(content);
  }

  /**
   * Analyze image using Claude Vision API
   *
   * @param imageBase64 - Base64-encoded image
   * @returns ProductAnalysis
   */
  private async analyzeWithClaude(imageBase64: string): Promise<ProductAnalysis> {
    if (!this.claude) {
      throw new Error('Claude client not initialized');
    }

    const response = await this.claude.messages.create({
      model: this.options.claudeModel,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: ANALYSIS_PROMPT + '\n\nJSON形式のみで返答してください。説明文は不要です。',
            },
          ],
        },
      ],
      temperature: 0.3,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude Vision API');
    }

    return this.parseAnalysisResponse(content.text);
  }

  /**
   * Analyze image using Google Gemini Vision API
   *
   * @param imageBase64 - Base64-encoded image
   * @returns ProductAnalysis
   */
  private async analyzeWithGemini(imageBase64: string): Promise<ProductAnalysis> {
    if (!this.gemini) {
      throw new Error('Gemini client not initialized');
    }

    const model = this.gemini.getGenerativeModel({ model: this.options.geminiModel });

    const response = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64,
        },
      },
      {
        text: ANALYSIS_PROMPT + '\n\nJSON形式のみで返答してください。説明文は不要です。',
      },
    ]);

    const content = response.response.text();
    if (!content) {
      throw new Error('No response content from Gemini Vision API');
    }

    return this.parseAnalysisResponse(content);
  }

  /**
   * Parse and validate JSON response from AI provider
   *
   * @param content - Raw JSON string from API
   * @returns ProductAnalysis
   */
  private parseAnalysisResponse(content: string): ProductAnalysis {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;

      const parsed = JSON.parse(jsonString);

      // Validate and construct ProductAnalysis
      return {
        productType: this.validateProductType(parsed.productType),
        productName: String(parsed.productName || '不明'),
        colors: Array.isArray(parsed.colors) ? parsed.colors.map(String) : [],
        features: Array.isArray(parsed.features) ? parsed.features.map(String) : [],
        targetAudience: String(parsed.targetAudience || '不明'),
        mood: Array.isArray(parsed.mood) ? parsed.mood.map(String) : [],
        brandStyle: String(parsed.brandStyle || '不明'),
        rawDescription: String(parsed.rawDescription || ''),
      };
    } catch (error) {
      throw new Error(
        `Failed to parse vision analysis response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate and normalize product type
   *
   * @param type - Raw product type string
   * @returns Validated ProductType
   */
  private validateProductType(type: unknown): ProductType {
    const validTypes: ProductType[] = ['lipstick', 'foundation', 'perfume', 'skincare', 'other'];
    const typeStr = String(type).toLowerCase();

    if (validTypes.includes(typeStr as ProductType)) {
      return typeStr as ProductType;
    }

    // Default to 'other' if invalid
    return 'other';
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
   * Mock implementation for testing
   *
   * @param _imageBase64 - Base64-encoded image (unused in mock)
   * @returns Mock ProductAnalysis
   */
  private analyzeMock(_imageBase64: string): ProductAnalysis {
    return {
      productType: 'lipstick',
      productName: 'Mock Coral Pink Lipstick',
      colors: ['coral pink', 'nude beige'],
      features: ['long-lasting', 'moisturizing', 'vibrant color'],
      targetAudience: '20-30代の働く女性',
      mood: ['elegant', 'modern', 'professional'],
      brandStyle: 'High-quality modern cosmetics brand',
      rawDescription: 'A beautiful coral pink lipstick with moisturizing properties, perfect for professional women in their 20s-30s.',
    };
  }
}

/**
 * Factory function to create VisionAnalyzer instance
 *
 * @param options - Configuration options
 * @returns New VisionAnalyzer instance
 */
export function createVisionAnalyzer(options?: VisionAnalyzerOptions): VisionAnalyzer {
  return new VisionAnalyzer(options);
}
