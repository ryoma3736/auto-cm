/**
 * Unit tests for Engine Recommender
 */

import { describe, it, expect } from 'vitest';
import { EngineRecommender, recommendEngine } from '../src/utils/engine-recommender.js';
import type { PipelineV2Input } from '../src/pipeline/v2.js';

describe('EngineRecommender', () => {
  describe('recommend()', () => {
    it('should recommend HeyGen for person image + audio', () => {
      const recommender = new EngineRecommender();
      const input: PipelineV2Input = {
        imageBase64: 'mock-product-image',
        personImageBase64: 'mock-person-image',
        audioUrl: 'https://example.com/audio.mp3',
      };

      const result = recommender.recommend(input);

      expect(result.engine).toBe('heygen');
      expect(result.confidence).toBeGreaterThanOrEqual(90);
      expect(result.reason).toContain('リップシンク');
    });

    it('should recommend Veo3 for long narration', () => {
      const recommender = new EngineRecommender({ longNarrationThreshold: 100 });
      const input: PipelineV2Input = {
        imageBase64: 'mock-product-image',
        narrationText: 'A'.repeat(150), // Long narration (150 chars)
      };

      const result = recommender.recommend(input);

      expect(result.engine).toBe('veo3');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
      expect(result.reason).toContain('音声同時生成');
    });

    it('should recommend Kling for product image only (default priority)', () => {
      const recommender = new EngineRecommender({ priority: 'speed' } as any); // No priority set
      const input: PipelineV2Input = {
        imageBase64: 'mock-product-image',
      };

      const result = recommender.recommend(input);

      expect(result.engine).toBe('kling');
      expect(result.confidence).toBeGreaterThanOrEqual(70);
      expect(result.reason).toContain('モーション');
    });

    it('should recommend Seedance for high quality priority', () => {
      const recommender = new EngineRecommender({ priority: 'quality' });
      const input: PipelineV2Input = {
        imageBase64: 'mock-product-image',
        personImageBase64: 'mock-person-image',
      };

      const result = recommender.recommend(input);

      expect(result.engine).toBe('seedance');
      expect(result.confidence).toBeGreaterThanOrEqual(75);
      expect(result.reason).toContain('シネマティック');
    });

    it('should recommend Seedance for cost priority', () => {
      const recommender = new EngineRecommender({ priority: 'cost' });
      const input: PipelineV2Input = {
        imageBase64: 'mock-product-image',
      };

      const result = recommender.recommend(input);

      expect(result.engine).toBe('seedance');
      expect(result.reason).toContain('コスト');
    });

    it('should provide alternatives', () => {
      const recommender = new EngineRecommender();
      const input: PipelineV2Input = {
        imageBase64: 'mock-product-image',
      };

      const result = recommender.recommend(input);

      expect(result.alternatives).toBeDefined();
      expect(result.alternatives!.length).toBeGreaterThan(0);
      expect(result.alternatives![0]).toHaveProperty('engine');
      expect(result.alternatives![0]).toHaveProperty('reason');
    });
  });

  describe('getEngineExplanation()', () => {
    it('should return explanation for each engine', () => {
      const recommender = new EngineRecommender();

      const heygenExpl = recommender.getEngineExplanation('heygen');
      expect(heygenExpl).toContain('リップシンク');

      const klingExpl = recommender.getEngineExplanation('kling');
      expect(klingExpl).toContain('モーション');

      const seedanceExpl = recommender.getEngineExplanation('seedance');
      expect(seedanceExpl).toContain('シネマティック');

      const veo3Expl = recommender.getEngineExplanation('veo3');
      expect(veo3Expl).toContain('音声付き');

      const allExpl = recommender.getEngineExplanation('all');
      expect(allExpl).toContain('A/B比較');
    });
  });

  describe('getEngineIcon()', () => {
    it('should return emoji icon for each engine', () => {
      const recommender = new EngineRecommender();

      expect(recommender.getEngineIcon('heygen')).toBe('🎤');
      expect(recommender.getEngineIcon('kling')).toBe('🎬');
      expect(recommender.getEngineIcon('seedance')).toBe('🎥');
      expect(recommender.getEngineIcon('veo3')).toBe('🔊');
      expect(recommender.getEngineIcon('all')).toBe('🚀');
    });
  });

  describe('getEngineColor()', () => {
    it('should return hex color for each engine', () => {
      const recommender = new EngineRecommender();

      expect(recommender.getEngineColor('heygen')).toMatch(/^#[0-9a-f]{6}$/i);
      expect(recommender.getEngineColor('kling')).toMatch(/^#[0-9a-f]{6}$/i);
      expect(recommender.getEngineColor('seedance')).toMatch(/^#[0-9a-f]{6}$/i);
      expect(recommender.getEngineColor('veo3')).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('recommendEngine() factory function', () => {
    it('should work as convenience function', () => {
      const input: PipelineV2Input = {
        imageBase64: 'mock-product-image',
        personImageBase64: 'mock-person-image',
        audioUrl: 'https://example.com/audio.mp3',
      };

      const result = recommendEngine(input);

      expect(result.engine).toBe('heygen');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should accept options', () => {
      const input: PipelineV2Input = {
        imageBase64: 'mock-product-image',
      };

      const result = recommendEngine(input, { priority: 'quality' });

      expect(result.engine).toBe('seedance');
    });
  });

  describe('Priority rules', () => {
    it('should prioritize person + audio over other conditions', () => {
      const recommender = new EngineRecommender({ priority: 'quality' });
      const input: PipelineV2Input = {
        imageBase64: 'mock-product-image',
        personImageBase64: 'mock-person-image',
        audioUrl: 'https://example.com/audio.mp3',
        narrationText: 'A'.repeat(150), // Long narration
      };

      const result = recommender.recommend(input);

      // Person + audio should win over long narration and quality priority
      expect(result.engine).toBe('heygen');
    });

    it('should prioritize long narration over product-only', () => {
      const recommender = new EngineRecommender();
      const input: PipelineV2Input = {
        imageBase64: 'mock-product-image',
        narrationText: 'A'.repeat(150),
      };

      const result = recommender.recommend(input);

      // Long narration should win over product-only
      expect(result.engine).toBe('veo3');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty input gracefully', () => {
      const recommender = new EngineRecommender();
      const input: PipelineV2Input = {};

      const result = recommender.recommend(input);

      // Should return a default recommendation
      expect(result.engine).toBeDefined();
      expect(result.reason).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle short narration as normal', () => {
      const recommender = new EngineRecommender({ longNarrationThreshold: 100 });
      const input: PipelineV2Input = {
        imageBase64: 'mock-product-image',
        narrationText: 'Short text', // Only 10 chars
      };

      const result = recommender.recommend(input);

      // Short narration should not trigger Veo3
      expect(result.engine).not.toBe('veo3');
    });

    it('should handle custom narration threshold', () => {
      const recommender = new EngineRecommender({ longNarrationThreshold: 50 });
      const input: PipelineV2Input = {
        imageBase64: 'mock-product-image',
        narrationText: 'A'.repeat(60), // 60 chars
      };

      const result = recommender.recommend(input);

      // 60 chars should be considered long with threshold of 50
      expect(result.engine).toBe('veo3');
    });
  });
});
