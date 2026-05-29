/**
 * AI Composite Module
 * Uses Gemini 2.0 Flash (Nano Banana Pro) to generate realistic
 * composite images of a person holding a product
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import type { ProductAnalysis } from '../image-analyzer/index.js';
import type { PersonProfile } from '../person-analyzer/index.js';

export interface AICompositeOptions {
  /** Gemini API key */
  geminiApiKey?: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

export interface AICompositeInput {
  /** Person image in base64 */
  personImageBase64: string;
  /** Product image in base64 */
  productImageBase64: string;
  /** Product analysis for better prompting */
  productAnalysis?: ProductAnalysis;
  /** Person profile for better prompting */
  personProfile?: PersonProfile;
  /** Output width */
  width?: number;
  /** Output height */
  height?: number;
}

export interface AICompositeResult {
  /** Generated composite image in base64 */
  base64: string;
  /** Output width */
  width: number;
  /** Output height */
  height: number;
  /** Whether AI generation was used (vs fallback) */
  isAIGenerated: boolean;
  /** Processing time in ms */
  processingTime: number;
}

/**
 * AICompositor - Creates realistic person-holding-product images using AI
 */
export class AICompositor {
  private gemini?: GoogleGenerativeAI;
  private verbose: boolean;
  // Latest Gemini 3 Pro Image model (Nano Banana Pro) - highest quality
  private modelName = 'gemini-3-pro-image-preview';

  constructor(options: AICompositeOptions = {}) {
    const apiKey = options.geminiApiKey || process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.gemini = new GoogleGenerativeAI(apiKey);
    }
    this.verbose = options.verbose ?? false;
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(`📸 [AICompositor] ${message}`);
    }
  }

  /**
   * Generate a composite image of person holding product
   */
  async generatePersonHoldingProduct(input: AICompositeInput): Promise<AICompositeResult> {
    const startTime = Date.now();
    const {
      personImageBase64,
      productImageBase64,
      productAnalysis,
      personProfile,
      width = 720,
      height = 1280,
    } = input;

    // Clean base64 data
    const personData = personImageBase64.replace(/^data:image\/\w+;base64,/, '');
    const productData = productImageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Try AI generation first
    if (this.gemini) {
      try {
        this.log('Starting AI composite generation...');
        const result = await this.generateWithGemini(
          personData,
          productData,
          productAnalysis,
          personProfile,
          width,
          height
        );

        this.log(`AI composite generated in ${Date.now() - startTime}ms`);
        return {
          ...result,
          isAIGenerated: true,
          processingTime: Date.now() - startTime,
        };
      } catch (error) {
        this.log(`AI generation failed: ${error instanceof Error ? error.message : error}`);
        this.log('Falling back to Sharp overlay...');
      }
    }

    // Fallback to Sharp overlay
    const fallbackResult = await this.fallbackOverlay(
      personData,
      productData,
      width,
      height
    );

    return {
      ...fallbackResult,
      isAIGenerated: false,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Generate composite using Gemini 2.0 Flash
   */
  private async generateWithGemini(
    personBase64: string,
    productBase64: string,
    productAnalysis?: ProductAnalysis,
    personProfile?: PersonProfile,
    width: number = 720,
    height: number = 1280
  ): Promise<{ base64: string; width: number; height: number }> {
    if (!this.gemini) {
      throw new Error('Gemini client not initialized');
    }

    const model = this.gemini.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        // @ts-ignore - responseModalities is valid for image models
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    // Build detailed prompt
    const productName = productAnalysis?.productName || 'product';
    const productType = productAnalysis?.productType || 'skincare';
    const productColors = productAnalysis?.colors?.join(', ') || 'white';
    const brandStyle = productAnalysis?.brandStyle || 'premium';

    const personGender = personProfile?.gender === 'female' ? 'woman' :
                        personProfile?.gender === 'male' ? 'man' : 'person';
    const personAge = personProfile?.estimatedAge || 25;

    const prompt = `You are an expert photo editor creating a professional advertisement image.

TASK: Generate a single, highly realistic composite image.

PERSON (Reference Image 1):
- A ${personAge}-year-old ${personGender}
- PRESERVE their EXACT appearance: face, hair color, skin tone, expression
- They should have a warm, friendly smile looking at the camera

PRODUCT (Reference Image 2):
- Product: ${productName}
- Type: ${productType}
- Colors: ${productColors}
- Style: ${brandStyle}
- This EXACT product must appear in the final image
- Any text/logo on the product should remain visible

COMPOSITION:
1. The ${personGender} holds the product at chest level with their right hand
2. The product is angled slightly toward the camera to show its label
3. Background: Clean, soft white-to-light-gray gradient
4. Lighting: Professional soft studio lighting, flattering for both person and product
5. Style: High-end beauty/cosmetics advertisement (like Shiseido or SK-II ads)
6. Vertical portrait orientation (${width}x${height})

CRITICAL REQUIREMENTS:
- The person's face MUST match the reference exactly
- The product design MUST match the reference exactly
- Do NOT substitute with a different product
- Natural hand positioning, as if genuinely holding the item
- Professional advertisement quality

Generate ONE realistic composite image.`;

    this.log(`Prompt length: ${prompt.length}`);

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: 'image/png',
          data: personBase64,
        },
      },
      {
        inlineData: {
          mimeType: 'image/png',
          data: productBase64,
        },
      },
    ]);

    const response = result.response;
    const parts = response.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if ('inlineData' in part && part.inlineData) {
        const generatedBase64 = part.inlineData.data;

        // Resize to target dimensions
        const generatedBuffer = Buffer.from(generatedBase64, 'base64');
        const resizedBuffer = await sharp(generatedBuffer)
          .resize(width, height, { fit: 'contain', background: '#FFFFFF' })
          .jpeg({ quality: 90 })
          .toBuffer();

        const metadata = await sharp(resizedBuffer).metadata();

        return {
          base64: resizedBuffer.toString('base64'),
          width: metadata.width || width,
          height: metadata.height || height,
        };
      }
    }

    throw new Error('No image returned from Gemini');
  }

  /**
   * Fallback overlay using Sharp
   */
  private async fallbackOverlay(
    personBase64: string,
    productBase64: string,
    width: number,
    height: number
  ): Promise<{ base64: string; width: number; height: number }> {
    const personBuffer = Buffer.from(personBase64, 'base64');
    const productBuffer = Buffer.from(productBase64, 'base64');

    // Resize person to fill canvas
    const personResized = await sharp(personBuffer)
      .resize(width, height, { fit: 'cover', position: 'center' })
      .toBuffer();

    // Resize product to 35% of width
    const productWidth = Math.floor(width * 0.35);
    const productHeight = Math.floor(height * 0.35);
    const productResized = await sharp(productBuffer)
      .resize(productWidth, productHeight, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toBuffer();

    // Position product at bottom-right
    const productLeft = width - productWidth - 20;
    const productTop = height - productHeight - 100;

    // Composite
    const result = await sharp(personResized)
      .composite([{ input: productResized, left: productLeft, top: productTop }])
      .jpeg({ quality: 90 })
      .toBuffer();

    return {
      base64: result.toString('base64'),
      width,
      height,
    };
  }
}

/**
 * Factory function
 */
export function createAICompositor(options?: AICompositeOptions): AICompositor {
  return new AICompositor(options);
}
