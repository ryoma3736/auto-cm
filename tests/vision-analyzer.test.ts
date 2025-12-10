/**
 * Unit tests for VisionAnalyzer module
 * Tests OpenAI Vision API integration, Claude fallback, error handling, and response parsing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  VisionAnalyzer,
  createVisionAnalyzer,
  type ProductAnalysis,
  type ProductType,
} from '../src/modules/image-analyzer/vision-analyzer.js';

// Mock OpenAI SDK
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  };
});

describe('VisionAnalyzer', () => {
  const mockBase64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const mockValidResponse: ProductAnalysis = {
    productType: 'lipstick',
    productName: 'Luxury Matte Lipstick - Coral Pink',
    colors: ['coral pink', 'nude undertone'],
    features: ['long-lasting formula', 'moisturizing', 'matte finish'],
    targetAudience: '20-30代の働く女性',
    mood: ['elegant', 'modern', 'sophisticated'],
    brandStyle: 'high-end luxury brand with minimalist aesthetic',
    rawDescription: 'A sleek coral pink lipstick in elegant packaging with gold accents',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-claude-key';
  });

  describe('Constructor and Initialization', () => {
    it('should create instance with OpenAI API key', () => {
      const analyzer = new VisionAnalyzer({
        openaiApiKey: 'test-key',
      });
      expect(analyzer).toBeInstanceOf(VisionAnalyzer);
    });

    it('should create instance with Claude API key', () => {
      const analyzer = new VisionAnalyzer({
        claudeApiKey: 'test-key',
      });
      expect(analyzer).toBeInstanceOf(VisionAnalyzer);
    });

    it('should use environment variables for API keys', () => {
      const analyzer = new VisionAnalyzer();
      expect(analyzer).toBeInstanceOf(VisionAnalyzer);
    });

    it('should throw error when no API keys are available', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      expect(() => {
        new VisionAnalyzer();
      }).toThrow('VisionAnalyzer requires at least one API key');
    });

    it('should accept custom model names', () => {
      const analyzer = new VisionAnalyzer({
        openaiApiKey: 'test-key',
        openaiModel: 'gpt-4-vision-preview',
        claudeModel: 'claude-3-opus-20240229',
      });
      expect(analyzer).toBeInstanceOf(VisionAnalyzer);
    });
  });

  describe('Factory Function', () => {
    it('should create instance using factory function', () => {
      const analyzer = createVisionAnalyzer({
        openaiApiKey: 'test-key',
      });
      expect(analyzer).toBeInstanceOf(VisionAnalyzer);
    });
  });

  describe('OpenAI Vision API Integration', () => {
    it('should successfully analyze image with OpenAI', async () => {
      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockValidResponse),
            },
          },
        ],
      });

      const mockInstance = new OpenAI();
      (mockInstance.chat.completions.create as any) = mockCreate;
      vi.mocked(OpenAI).mockReturnValue(mockInstance as any);

      const analyzer = new VisionAnalyzer({ openaiApiKey: 'test-key' });
      const result = await analyzer.analyze(mockBase64Image);

      expect(result).toEqual(mockValidResponse);
      expect(mockCreate).toHaveBeenCalled();
      const callArg = mockCreate.mock.calls[0][0];
      expect(callArg.model).toBe('gpt-5.1');
      expect(callArg.response_format).toEqual({ type: 'json_object' });
      expect(callArg.messages[0].role).toBe('user');
      expect(callArg.messages[0].content).toHaveLength(2);
      expect(callArg.messages[0].content[0].type).toBe('text');
      expect(callArg.messages[0].content[1].type).toBe('image_url');
    });

    it('should handle JSON wrapped in markdown code blocks', async () => {
      const OpenAI = (await import('openai')).default;
      const markdownResponse = '```json\n' + JSON.stringify(mockValidResponse) + '\n```';

      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: markdownResponse,
            },
          },
        ],
      });

      const mockInstance = new OpenAI();
      (mockInstance.chat.completions.create as any) = mockCreate;
      vi.mocked(OpenAI).mockReturnValue(mockInstance as any);

      const analyzer = new VisionAnalyzer({ openaiApiKey: 'test-key' });
      const result = await analyzer.analyze(mockBase64Image);

      expect(result).toEqual(mockValidResponse);
    });

    it('should validate and normalize product types', async () => {
      const OpenAI = (await import('openai')).default;
      const responseWithInvalidType = {
        ...mockValidResponse,
        productType: 'LIPSTICK', // uppercase - should be normalized
      };

      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(responseWithInvalidType),
            },
          },
        ],
      });

      const mockInstance = new OpenAI();
      (mockInstance.chat.completions.create as any) = mockCreate;
      vi.mocked(OpenAI).mockReturnValue(mockInstance as any);

      const analyzer = new VisionAnalyzer({ openaiApiKey: 'test-key' });
      const result = await analyzer.analyze(mockBase64Image);

      expect(result.productType).toBe('lipstick');
    });

    it('should default to "other" for invalid product types', async () => {
      const OpenAI = (await import('openai')).default;
      const responseWithInvalidType = {
        ...mockValidResponse,
        productType: 'invalid-type',
      };

      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(responseWithInvalidType),
            },
          },
        ],
      });

      const mockInstance = new OpenAI();
      (mockInstance.chat.completions.create as any) = mockCreate;
      vi.mocked(OpenAI).mockReturnValue(mockInstance as any);

      const analyzer = new VisionAnalyzer({ openaiApiKey: 'test-key' });
      const result = await analyzer.analyze(mockBase64Image);

      expect(result.productType).toBe('other');
    });
  });

  describe('Claude Vision API Fallback', () => {
    it('should use Claude when useClaudePrimary is true', async () => {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockValidResponse),
          },
        ],
      });

      const mockInstance = new Anthropic();
      (mockInstance.messages.create as any) = mockCreate;
      vi.mocked(Anthropic).mockReturnValue(mockInstance as any);

      const analyzer = new VisionAnalyzer({
        claudeApiKey: 'test-key',
        useClaudePrimary: true,
      });
      const result = await analyzer.analyze(mockBase64Image);

      expect(result).toEqual(mockValidResponse);
      expect(mockCreate).toHaveBeenCalled();
      const callArg = mockCreate.mock.calls[0][0];
      expect(callArg.model).toBe('claude-sonnet-4-5-20250929');
      expect(callArg.messages[0].role).toBe('user');
      expect(callArg.messages[0].content).toHaveLength(2);
      expect(callArg.messages[0].content[0].type).toBe('image');
      expect(callArg.messages[0].content[1].type).toBe('text');
    });

    it('should fallback to Claude when OpenAI fails', async () => {
      const OpenAI = (await import('openai')).default;
      const Anthropic = (await import('@anthropic-ai/sdk')).default;

      // OpenAI fails
      const mockOpenAICreate = vi.fn().mockRejectedValue(new Error('OpenAI API error'));
      const mockOpenAIInstance = new OpenAI();
      (mockOpenAIInstance.chat.completions.create as any) = mockOpenAICreate;
      vi.mocked(OpenAI).mockReturnValue(mockOpenAIInstance as any);

      // Claude succeeds
      const mockClaudeCreate = vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockValidResponse),
          },
        ],
      });
      const mockClaudeInstance = new Anthropic();
      (mockClaudeInstance.messages.create as any) = mockClaudeCreate;
      vi.mocked(Anthropic).mockReturnValue(mockClaudeInstance as any);

      const analyzer = new VisionAnalyzer({
        openaiApiKey: 'test-openai-key',
        claudeApiKey: 'test-claude-key',
        maxRetries: 1, // Only 1 attempt per provider
      });

      const result = await analyzer.analyze(mockBase64Image);

      expect(result).toEqual(mockValidResponse);
      expect(mockOpenAICreate).toHaveBeenCalled();
      expect(mockClaudeCreate).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when response has no content', async () => {
      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      });

      const mockInstance = new OpenAI();
      (mockInstance.chat.completions.create as any) = mockCreate;
      vi.mocked(OpenAI).mockReturnValue(mockInstance as any);

      const analyzer = new VisionAnalyzer({
        openaiApiKey: 'test-key',
        claudeApiKey: undefined, // Disable fallback
        maxRetries: 1,
      });

      await expect(analyzer.analyze(mockBase64Image)).rejects.toThrow(
        'Vision analysis failed after 1 attempts'
      );
    });

    it('should throw error when response is invalid JSON', async () => {
      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'This is not valid JSON',
            },
          },
        ],
      });

      const mockInstance = new OpenAI();
      (mockInstance.chat.completions.create as any) = mockCreate;
      vi.mocked(OpenAI).mockReturnValue(mockInstance as any);

      const analyzer = new VisionAnalyzer({
        openaiApiKey: 'test-key',
        claudeApiKey: undefined, // Disable fallback
        maxRetries: 1,
      });

      await expect(analyzer.analyze(mockBase64Image)).rejects.toThrow(
        'Vision analysis failed after 1 attempts'
      );
    });

    it('should retry on API failure', async () => {
      const OpenAI = (await import('openai')).default;
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      let attemptCount = 0;

      const mockOpenAICreate = vi.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary API error');
        }
        return {
          choices: [
            {
              message: {
                content: JSON.stringify(mockValidResponse),
              },
            },
          ],
        };
      });

      const mockOpenAIInstance = new OpenAI();
      (mockOpenAIInstance.chat.completions.create as any) = mockOpenAICreate;
      vi.mocked(OpenAI).mockReturnValue(mockOpenAIInstance as any);

      // Mock Claude to also fail on first attempts (to force retries)
      const mockClaudeCreate = vi.fn().mockRejectedValue(new Error('Claude unavailable'));
      const mockClaudeInstance = new Anthropic();
      (mockClaudeInstance.messages.create as any) = mockClaudeCreate;
      vi.mocked(Anthropic).mockReturnValue(mockClaudeInstance as any);

      const analyzer = new VisionAnalyzer({
        openaiApiKey: 'test-key',
        claudeApiKey: 'test-claude-key',
        maxRetries: 3,
      });

      const result = await analyzer.analyze(mockBase64Image);

      expect(result).toEqual(mockValidResponse);
      expect(mockOpenAICreate).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const OpenAI = (await import('openai')).default;
      const mockCreate = vi.fn().mockRejectedValue(new Error('Persistent API error'));

      const mockInstance = new OpenAI();
      (mockInstance.chat.completions.create as any) = mockCreate;
      vi.mocked(OpenAI).mockReturnValue(mockInstance as any);

      const analyzer = new VisionAnalyzer({
        openaiApiKey: 'test-key',
        claudeApiKey: undefined,
        maxRetries: 2,
      });

      await expect(analyzer.analyze(mockBase64Image)).rejects.toThrow(
        'Vision analysis failed after 2 attempts'
      );
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Response Parsing', () => {
    it('should handle missing optional fields gracefully', async () => {
      const OpenAI = (await import('openai')).default;
      const partialResponse = {
        productType: 'skincare',
        // Missing other fields
      };

      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(partialResponse),
            },
          },
        ],
      });

      const mockInstance = new OpenAI();
      (mockInstance.chat.completions.create as any) = mockCreate;
      vi.mocked(OpenAI).mockReturnValue(mockInstance as any);

      const analyzer = new VisionAnalyzer({ openaiApiKey: 'test-key' });
      const result = await analyzer.analyze(mockBase64Image);

      expect(result.productType).toBe('skincare');
      expect(result.productName).toBe('不明');
      expect(result.colors).toEqual([]);
      expect(result.features).toEqual([]);
      expect(result.targetAudience).toBe('不明');
      expect(result.mood).toEqual([]);
      expect(result.brandStyle).toBe('不明');
      expect(result.rawDescription).toBe('');
    });

    it('should handle arrays correctly', async () => {
      const OpenAI = (await import('openai')).default;
      const responseWithArrays = {
        ...mockValidResponse,
        colors: ['red', 'pink', 'coral'],
        features: ['feature1', 'feature2'],
        mood: ['mood1'],
      };

      const mockCreate = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(responseWithArrays),
            },
          },
        ],
      });

      const mockInstance = new OpenAI();
      (mockInstance.chat.completions.create as any) = mockCreate;
      vi.mocked(OpenAI).mockReturnValue(mockInstance as any);

      const analyzer = new VisionAnalyzer({ openaiApiKey: 'test-key' });
      const result = await analyzer.analyze(mockBase64Image);

      expect(result.colors).toHaveLength(3);
      expect(result.features).toHaveLength(2);
      expect(result.mood).toHaveLength(1);
    });
  });

  describe('Product Type Validation', () => {
    const validTypes: ProductType[] = ['lipstick', 'foundation', 'perfume', 'skincare', 'other'];

    validTypes.forEach((type) => {
      it(`should accept valid product type: ${type}`, async () => {
        const OpenAI = (await import('openai')).default;
        const response = {
          ...mockValidResponse,
          productType: type,
        };

        const mockCreate = vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify(response),
              },
            },
          ],
        });

        const mockInstance = new OpenAI();
        (mockInstance.chat.completions.create as any) = mockCreate;
        vi.mocked(OpenAI).mockReturnValue(mockInstance as any);

        const analyzer = new VisionAnalyzer({ openaiApiKey: 'test-key' });
        const result = await analyzer.analyze(mockBase64Image);

        expect(result.productType).toBe(type);
      });
    });
  });
});
