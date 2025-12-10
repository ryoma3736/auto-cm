/**
 * Video Generator Module Tests
 *
 * Tests for Sora2 video generation with mock implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  VideoGenerator,
  createVideoGenerator,
  type VideoRequest,
  type VideoGeneration,
  type GenerationStatus,
  type VideoResult,
} from '../src/modules/video-generator/index.js';

describe('VideoGenerator', () => {
  describe('Constructor and Configuration', () => {
    it('should create instance with default options', () => {
      const generator = new VideoGenerator();
      expect(generator).toBeInstanceOf(VideoGenerator);
    });

    it('should create instance with custom options', () => {
      const generator = new VideoGenerator({
        apiKey: 'test-key',
        baseUrl: 'https://custom-api.example.com',
        maxWaitTime: 10000,
        pollInterval: 1000,
        useMock: false,
      });
      expect(generator).toBeInstanceOf(VideoGenerator);
    });

    it('should fall back to mock when no API key is provided', () => {
      const originalEnv = process.env.SORA2_API_KEY;
      delete process.env.SORA2_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const generator = new VideoGenerator();
      expect(generator).toBeInstanceOf(VideoGenerator);

      if (originalEnv) {
        process.env.SORA2_API_KEY = originalEnv;
      }
    });

    it('should use environment variables for API key', () => {
      const originalKey = process.env.SORA2_API_KEY;
      process.env.SORA2_API_KEY = 'env-test-key';

      const generator = new VideoGenerator();
      expect(generator).toBeInstanceOf(VideoGenerator);

      if (originalKey) {
        process.env.SORA2_API_KEY = originalKey;
      } else {
        delete process.env.SORA2_API_KEY;
      }
    });
  });

  describe('Factory Function', () => {
    it('should create instance via factory function', () => {
      const generator = createVideoGenerator();
      expect(generator).toBeInstanceOf(VideoGenerator);
    });

    it('should pass options to factory function', () => {
      const generator = createVideoGenerator({
        apiKey: 'factory-test-key',
        useMock: true,
      });
      expect(generator).toBeInstanceOf(VideoGenerator);
    });
  });

  describe('Mock Implementation - generate()', () => {
    let generator: VideoGenerator;

    beforeEach(() => {
      generator = new VideoGenerator({ useMock: true });
    });

    it('should generate video with mock implementation', async () => {
      const request: VideoRequest = {
        firstFrameImage: 'base64-encoded-image',
        prompt: 'A beautiful sunset over the ocean',
        duration: 12,
        aspectRatio: '9:16',
      };

      const result: VideoGeneration = await generator.generate(request);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.id).toContain('mock-');
      expect(result.status).toBe('pending');
      expect(result.estimatedTimeSeconds).toBe(30);
    });

    it('should accept request with minimal fields', async () => {
      const request: VideoRequest = {
        firstFrameImage: 'base64-image',
        prompt: 'Test prompt',
      };

      const result = await generator.generate(request);

      expect(result.id).toBeDefined();
      expect(result.status).toBe('pending');
    });

    it('should accept different aspect ratios', async () => {
      const ratios: Array<'9:16' | '16:9' | '1:1'> = ['9:16', '16:9', '1:1'];

      for (const aspectRatio of ratios) {
        const request: VideoRequest = {
          firstFrameImage: 'base64-image',
          prompt: 'Test',
          aspectRatio,
        };

        const result = await generator.generate(request);
        expect(result.id).toBeDefined();
      }
    });
  });

  describe('Mock Implementation - checkStatus()', () => {
    let generator: VideoGenerator;

    beforeEach(() => {
      generator = new VideoGenerator({ useMock: true });
    });

    it('should return pending status immediately after generation', async () => {
      const request: VideoRequest = {
        firstFrameImage: 'base64-image',
        prompt: 'Test',
      };

      const generation = await generator.generate(request);
      const status = await generator.checkStatus(generation.id);

      expect(status.id).toBe(generation.id);
      expect(status.status).toBe('pending');
      expect(status.progress).toBeDefined();
      expect(status.progress).toBeGreaterThanOrEqual(0);
    });

    it('should return error for non-existent generation ID', async () => {
      const status = await generator.checkStatus('non-existent-id');

      expect(status.status).toBe('failed');
      expect(status.error).toBe('Generation ID not found');
    });

    it('should progress status over time', async () => {
      const request: VideoRequest = {
        firstFrameImage: 'base64-image',
        prompt: 'Test',
      };

      const generation = await generator.generate(request);

      const status1 = await generator.checkStatus(generation.id);
      expect(status1.progress).toBeDefined();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      const status2 = await generator.checkStatus(generation.id);
      expect(status2.progress).toBeGreaterThanOrEqual(status1.progress || 0);
    });
  });

  describe('Mock Implementation - getVideo()', () => {
    let generator: VideoGenerator;

    beforeEach(() => {
      generator = new VideoGenerator({ useMock: true });
    });

    it('should return video result after completion', async () => {
      const request: VideoRequest = {
        firstFrameImage: 'base64-image',
        prompt: 'Test video',
        duration: 10,
        aspectRatio: '16:9',
      };

      const generation = await generator.generate(request);

      // Wait for mock completion (15 seconds simulated)
      await new Promise((resolve) => setTimeout(resolve, 15100));

      const video = await generator.getVideo(generation.id);

      expect(video.id).toBe(generation.id);
      expect(video.videoUrl).toContain('mock-videos');
      expect(video.duration).toBe(10);
      expect(video.resolution).toEqual({ width: 1280, height: 720 });
      expect(video.createdAt).toBeDefined();
    }, 20000); // 20 second timeout

    it('should throw error for non-existent generation ID', async () => {
      await expect(
        generator.getVideo('non-existent-id')
      ).rejects.toThrow('Generation ID not found');
    });

    it('should return correct resolution for 9:16 aspect ratio', async () => {
      const request: VideoRequest = {
        firstFrameImage: 'base64-image',
        prompt: 'Test',
        aspectRatio: '9:16',
      };

      const generation = await generator.generate(request);
      await new Promise((resolve) => setTimeout(resolve, 15100));

      const video = await generator.getVideo(generation.id);
      expect(video.resolution).toEqual({ width: 720, height: 1280 });
    }, 20000);

    it('should return correct resolution for 1:1 aspect ratio', async () => {
      const request: VideoRequest = {
        firstFrameImage: 'base64-image',
        prompt: 'Test',
        aspectRatio: '1:1',
      };

      const generation = await generator.generate(request);
      await new Promise((resolve) => setTimeout(resolve, 15100));

      const video = await generator.getVideo(generation.id);
      expect(video.resolution).toEqual({ width: 1080, height: 1080 });
    }, 20000);
  });

  describe('Mock Implementation - generateAndWait()', () => {
    let generator: VideoGenerator;

    beforeEach(() => {
      generator = new VideoGenerator({
        useMock: true,
        pollInterval: 100, // Fast polling for tests
        maxWaitTime: 20000, // 20 seconds timeout
      });
    });

    it('should generate video and wait for completion', async () => {
      const request: VideoRequest = {
        firstFrameImage: 'base64-image',
        prompt: 'Test video with wait',
        duration: 8,
      };

      const video = await generator.generateAndWait(request);

      expect(video).toBeDefined();
      expect(video.id).toBeDefined();
      expect(video.videoUrl).toBeDefined();
      expect(video.duration).toBe(8);
      expect(video.resolution).toBeDefined();
    }, 20000); // 20 second timeout for this test

    it('should throw timeout error if generation takes too long', async () => {
      const generator = new VideoGenerator({
        useMock: true,
        pollInterval: 100,
        maxWaitTime: 1000, // 1 second timeout (too short)
      });

      const request: VideoRequest = {
        firstFrameImage: 'base64-image',
        prompt: 'Test timeout',
      };

      await expect(
        generator.generateAndWait(request)
      ).rejects.toThrow('Video generation timeout');
    }, 5000);
  });

  describe('Real API Implementation (mocked fetch)', () => {
    beforeEach(() => {
      // Clear any existing fetch mock
      vi.restoreAllMocks();
      // Set a mock API token for these tests
      process.env.REPLICATE_API_TOKEN = 'test-replicate-token';
    });

    afterEach(() => {
      // Clean up the mock token
      delete process.env.REPLICATE_API_TOKEN;
    });

    it.skip('should call Sora2 API with correct parameters', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'api-gen-123',
            status: 'pending',
            estimated_seconds: 120,
          }),
        })
      ) as unknown as typeof fetch;

      global.fetch = mockFetch;

      const generator = new VideoGenerator({
        apiKey: 'test-api-key',
        useMock: false,
      });

      const request: VideoRequest = {
        firstFrameImage: 'base64-image',
        prompt: 'API test prompt',
        duration: 15,
        aspectRatio: '16:9',
      };

      const result = await generator.generate(request);

      expect(mockFetch).toHaveBeenCalledOnce();
      expect(result.id).toBe('api-gen-123');
      expect(result.status).toBe('pending');
      expect(result.estimatedTimeSeconds).toBe(120);

      vi.restoreAllMocks();
    });

    it.skip('should handle API error responses', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          text: async () => 'Bad Request',
        })
      ) as unknown as typeof fetch;

      global.fetch = mockFetch;

      const generator = new VideoGenerator({
        apiKey: 'test-api-key',
        useMock: false,
      });

      const request: VideoRequest = {
        firstFrameImage: 'base64-image',
        prompt: 'Test',
      };

      await expect(generator.generate(request)).rejects.toThrow('Sora2 API error');

      vi.restoreAllMocks();
    });

    it.skip('should check status via API', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'api-gen-123',
            status: 'processing',
            progress: 45,
          }),
        })
      ) as unknown as typeof fetch;

      global.fetch = mockFetch;

      const generator = new VideoGenerator({
        apiKey: 'test-api-key',
        useMock: false,
      });

      const status = await generator.checkStatus('api-gen-123');

      expect(mockFetch).toHaveBeenCalledOnce();
      expect(status.id).toBe('api-gen-123');
      expect(status.status).toBe('processing');
      expect(status.progress).toBe(45);

      vi.restoreAllMocks();
    });

    it.skip('should get video result via API', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'api-gen-123',
            status: 'completed',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'api-gen-123',
            status: 'completed',
            video_url: 'https://example.com/video.mp4',
            duration: 12,
            resolution: { width: 1280, height: 720 },
            created_at: '2024-01-01T00:00:00Z',
          }),
        }) as unknown as typeof fetch;

      global.fetch = mockFetch;

      const generator = new VideoGenerator({
        apiKey: 'test-api-key',
        useMock: false,
      });

      const video = await generator.getVideo('api-gen-123');

      expect(video.id).toBe('api-gen-123');
      expect(video.videoUrl).toBe('https://example.com/video.mp4');
      expect(video.duration).toBe(12);
      expect(video.resolution).toEqual({ width: 1280, height: 720 });

      vi.restoreAllMocks();
    });

    it.skip('should throw error if video is not completed', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'api-gen-123',
            status: 'processing',
          }),
        })
      ) as unknown as typeof fetch;

      global.fetch = mockFetch;

      const generator = new VideoGenerator({
        apiKey: 'test-api-key',
        useMock: false,
      });

      await expect(
        generator.getVideo('api-gen-123')
      ).rejects.toThrow('Video generation not completed yet');

      vi.restoreAllMocks();
    });
  });

  describe('Type Safety', () => {
    it('should enforce VideoRequest interface', () => {
      const request: VideoRequest = {
        firstFrameImage: 'base64-data',
        prompt: 'Type test',
        duration: 10,
        aspectRatio: '9:16',
      };

      expect(request.firstFrameImage).toBeDefined();
      expect(request.prompt).toBeDefined();
    });

    it('should enforce VideoGeneration interface', () => {
      const generation: VideoGeneration = {
        id: 'test-id',
        status: 'pending',
        estimatedTimeSeconds: 120,
      };

      expect(generation.id).toBe('test-id');
      expect(generation.status).toBe('pending');
    });

    it('should enforce GenerationStatus interface', () => {
      const status: GenerationStatus = {
        id: 'test-id',
        status: 'processing',
        progress: 50,
      };

      expect(status.progress).toBe(50);
    });

    it('should enforce VideoResult interface', () => {
      const result: VideoResult = {
        id: 'test-id',
        videoUrl: 'https://example.com/video.mp4',
        duration: 12,
        resolution: { width: 1280, height: 720 },
        createdAt: '2024-01-01T00:00:00Z',
      };

      expect(result.videoUrl).toBeDefined();
      expect(result.resolution).toEqual({ width: 1280, height: 720 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string API key', () => {
      const generator = new VideoGenerator({ apiKey: '', useMock: true });
      expect(generator).toBeInstanceOf(VideoGenerator);
    });

    it('should handle very short timeout', async () => {
      const generator = new VideoGenerator({
        useMock: true,
        maxWaitTime: 1,
        pollInterval: 1,
      });

      const request: VideoRequest = {
        firstFrameImage: 'test',
        prompt: 'test',
      };

      await expect(
        generator.generateAndWait(request)
      ).rejects.toThrow('timeout');
    }, 5000);

    it('should handle base64 image with data URI prefix', async () => {
      const generator = new VideoGenerator({ useMock: true });

      const request: VideoRequest = {
        firstFrameImage: 'data:image/jpeg;base64,abcdef',
        prompt: 'test',
      };

      const result = await generator.generate(request);
      expect(result.id).toBeDefined();
    });

    it('should handle base64 image without data URI prefix', async () => {
      const generator = new VideoGenerator({ useMock: true });

      const request: VideoRequest = {
        firstFrameImage: 'abcdef',
        prompt: 'test',
      };

      const result = await generator.generate(request);
      expect(result.id).toBeDefined();
    });
  });

  describe('Talent Prompt Integration (#88)', () => {
    it('should import generateTalentPrompt function', async () => {
      // Dynamic import to test exports
      const module = await import('../src/modules/video-generator/person-prompt.js');

      expect(module.generatePersonPrompt).toBeDefined();
      expect(typeof module.generatePersonPrompt).toBe('function');
    });

    it('should generate talent-specific prompt from TalentProfile', async () => {
      const { generatePersonPrompt } = await import('../src/modules/video-generator/person-prompt.js');

      const mockTalentProfile = {
        name: '新垣結衣',
        appearance: {
          faceType: '美人系、卵型の整った顔立ち',
          hairStyle: 'ロングストレート',
          bodyType: 'スリム',
          fashionStyle: 'ナチュラル、カジュアルエレガント',
        },
        personality: {
          speakingStyle: '柔らかく優しい',
          tone: '温かい、落ち着いた',
        },
        videoPromptHints: 'A young Japanese woman with oval-shaped beautiful face, long straight hair, slim body type, dressed in natural casual-elegant fashion.',
      };

      const mockPersonProfile = {
        estimatedAge: 30,
        gender: 'female' as const,
        facialFeatures: 'Beautiful oval face',
        expression: 'Gentle smile',
        hairStyle: 'Long straight hair',
        clothingStyle: 'Casual elegant',
      };

      const mockProductAnalysis = {
        productType: 'lipstick',
        productName: 'Test Lipstick',
        colors: ['Pink', 'Rose'],
        features: ['Long-lasting'],
        targetAudience: 'Women 20-30',
        mood: ['Elegant'],
        brandStyle: 'Modern',
        rawDescription: 'Test',
      };

      const mockScript = {
        totalDuration: 12,
        scenes: [
          {
            sceneNumber: 1,
            timeCode: '00:00-00:04',
            durationSeconds: 4,
            narration: 'テスト',
            emotion: 'excited',
            cameraDirection: 'close-up',
            visualDescription: 'Test scene',
          },
          {
            sceneNumber: 2,
            timeCode: '00:04-00:08',
            durationSeconds: 4,
            narration: 'テスト',
            emotion: 'calm',
            cameraDirection: 'medium',
            visualDescription: 'Test scene 2',
          },
          {
            sceneNumber: 3,
            timeCode: '00:08-00:12',
            durationSeconds: 4,
            narration: 'テスト',
            emotion: 'satisfied',
            cameraDirection: 'selfie',
            visualDescription: 'Test scene 3',
          },
        ],
        sora2Prompt: 'Original prompt',
      };

      const request = {
        personProfile: mockPersonProfile,
        productAnalysis: mockProductAnalysis,
        script: mockScript,
        duration: 12,
        language: 'ja' as const,
        talentProfile: mockTalentProfile,
      };

      const result = generatePersonPrompt(request);

      expect(result).toBeDefined();
      expect(result.prompt).toBeTruthy();
      expect(result.personDescription).toContain('新垣結衣');
      expect(result.personDescription).toContain('oval-shaped beautiful face');
      expect(result.scenePrompts).toHaveLength(3);
      expect(result.cameraMovements).toBeDefined();
    });

    it('should generate prompt without talent profile', async () => {
      const { generatePersonPrompt } = await import('../src/modules/video-generator/person-prompt.js');

      const mockPersonProfile = {
        estimatedAge: 28,
        gender: 'female' as const,
        facialFeatures: 'Friendly face',
        expression: 'Warm smile',
        hairStyle: 'Medium hair',
        clothingStyle: 'Casual',
      };

      const mockProductAnalysis = {
        productType: 'skincare',
        productName: 'Test Product',
        colors: ['White'],
        features: ['Hydrating'],
        targetAudience: 'Women 25-35',
        mood: ['Fresh'],
        brandStyle: 'Natural',
        rawDescription: 'Test',
      };

      const mockScript = {
        totalDuration: 12,
        scenes: [
          {
            sceneNumber: 1,
            timeCode: '00:00-00:04',
            durationSeconds: 4,
            narration: 'テスト',
            emotion: 'excited',
            cameraDirection: 'close-up',
            visualDescription: 'Test',
          },
          {
            sceneNumber: 2,
            timeCode: '00:04-00:08',
            durationSeconds: 4,
            narration: 'テスト',
            emotion: 'calm',
            cameraDirection: 'medium',
            visualDescription: 'Test',
          },
          {
            sceneNumber: 3,
            timeCode: '00:08-00:12',
            durationSeconds: 4,
            narration: 'テスト',
            emotion: 'satisfied',
            cameraDirection: 'selfie',
            visualDescription: 'Test',
          },
        ],
        sora2Prompt: 'Original',
      };

      const request = {
        personProfile: mockPersonProfile,
        productAnalysis: mockProductAnalysis,
        script: mockScript,
        duration: 12,
        language: 'ja' as const,
      };

      const result = generatePersonPrompt(request);

      expect(result).toBeDefined();
      expect(result.prompt).toBeTruthy();
      expect(result.personDescription).toBeTruthy();
      expect(result.scenePrompts).toHaveLength(3);
    });

    it('should merge talent prompt with script prompt', async () => {
      const { mergeWithScriptPrompt } = await import('../src/modules/video-generator/person-prompt.js');

      const enhancedPromptResult = {
        prompt: 'Enhanced prompt with talent details',
        personDescription: 'A Japanese woman resembling 新垣結衣',
        scenePrompts: ['Scene 1', 'Scene 2', 'Scene 3'],
        cameraMovements: ['static', 'pan'],
      };

      const originalPrompt = 'Original UGC script prompt for video generation';

      const mergedPrompt = mergeWithScriptPrompt(enhancedPromptResult, originalPrompt);

      expect(mergedPrompt).toBeTruthy();
      expect(mergedPrompt).toContain('新垣結衣');
      expect(mergedPrompt.length).toBeLessThanOrEqual(1000); // Respects Sora2 limit
    });

    it('should create composite prompt for person and product', async () => {
      const { createCompositePrompt } = await import('../src/modules/video-generator/person-prompt.js');

      const mockPersonProfile = {
        estimatedAge: 30,
        gender: 'female' as const,
        facialFeatures: 'Elegant features',
        expression: 'Confident smile',
        hairStyle: 'Long wavy hair',
        clothingStyle: 'Professional attire',
      };

      const mockProductAnalysis = {
        productType: 'lipstick',
        productName: 'Premium Lipstick',
        colors: ['Red'],
        features: ['Matte finish'],
        targetAudience: 'Women 25-40',
        mood: ['Sophisticated'],
        brandStyle: 'Luxury',
        rawDescription: 'Test',
      };

      const compositePrompt = createCompositePrompt(mockPersonProfile, mockProductAnalysis);

      expect(compositePrompt).toBeTruthy();
      expect(compositePrompt).toContain('30-year-old woman');
      expect(compositePrompt).toContain('Premium Lipstick');
      expect(compositePrompt).toContain('Elegant features');
    });

    it('should generate different camera movements based on duration', async () => {
      const { generatePersonPrompt } = await import('../src/modules/video-generator/person-prompt.js');

      const baseRequest = {
        personProfile: {
          estimatedAge: 25,
          gender: 'female' as const,
          facialFeatures: 'Youthful',
          expression: 'Happy',
          hairStyle: 'Short',
          clothingStyle: 'Casual',
        },
        productAnalysis: {
          productType: 'product',
          productName: 'Test',
          colors: ['Blue'],
          features: ['Feature'],
          targetAudience: 'All',
          mood: ['Happy'],
          brandStyle: 'Modern',
          rawDescription: 'Test',
        },
        script: {
          totalDuration: 12,
          scenes: [
            {
              sceneNumber: 1,
              timeCode: '00:00-00:04',
              durationSeconds: 4,
              narration: 'Test',
              emotion: 'neutral',
              cameraDirection: 'medium',
              visualDescription: 'Test',
            },
          ],
          sora2Prompt: 'Test',
        },
        language: 'ja' as const,
      };

      // Test 4-second duration
      const result4s = generatePersonPrompt({ ...baseRequest, duration: 4 });
      expect(result4s.cameraMovements.length).toBeGreaterThan(0);

      // Test 8-second duration
      const result8s = generatePersonPrompt({ ...baseRequest, duration: 8 });
      expect(result8s.cameraMovements.length).toBeGreaterThan(0);

      // Test 12-second duration
      const result12s = generatePersonPrompt({ ...baseRequest, duration: 12 });
      expect(result12s.cameraMovements.length).toBeGreaterThan(result4s.cameraMovements.length);
    });
  });
});
