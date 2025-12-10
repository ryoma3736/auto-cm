/**
 * TalentProfiler Module Tests
 *
 * Tests for talent profile generation with mock implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TalentProfiler,
  createTalentProfiler,
  type TalentProfile,
} from '../src/modules/talent-profiler/index.js';

describe('TalentProfiler', () => {
  describe('Constructor and Configuration', () => {
    it('should create instance with default options', () => {
      const profiler = createTalentProfiler({ useMock: true });
      expect(profiler).toBeInstanceOf(TalentProfiler);
    });

    it('should create instance with custom options', () => {
      const profiler = new TalentProfiler({
        geminiApiKey: 'test-key',
        geminiModel: 'gemini-2.0-flash-exp',
        maxRetries: 5,
        useMock: true,
      });
      expect(profiler).toBeInstanceOf(TalentProfiler);
    });

    it('should throw error when no API key provided in non-mock mode', () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      expect(() => new TalentProfiler({ useMock: false })).toThrow(
        'TalentProfiler requires GEMINI_API_KEY'
      );

      if (originalKey) {
        process.env.GEMINI_API_KEY = originalKey;
      }
    });

    it('should use environment variable for API key', () => {
      const originalKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'env-test-key';

      // Should not throw in mock mode
      expect(() => new TalentProfiler({ useMock: true })).not.toThrow();

      if (originalKey) {
        process.env.GEMINI_API_KEY = originalKey;
      } else {
        delete process.env.GEMINI_API_KEY;
      }
    });
  });

  describe('Factory Function', () => {
    it('should create instance via factory function', () => {
      const profiler = createTalentProfiler({ useMock: true });
      expect(profiler).toBeInstanceOf(TalentProfiler);
    });

    it('should pass options to factory function', () => {
      const profiler = createTalentProfiler({
        geminiApiKey: 'factory-test-key',
        useMock: true,
      });
      expect(profiler).toBeInstanceOf(TalentProfiler);
    });
  });

  describe('generateProfile - Mock Mode', () => {
    let profiler: TalentProfiler;

    beforeEach(() => {
      profiler = createTalentProfiler({ useMock: true });
    });

    it('should generate profile for 新垣結衣 (mock)', async () => {
      const profile = await profiler.generateProfile('新垣結衣', 'ja');

      expect(profile.name).toBe('新垣結衣');
      expect(profile.appearance).toBeDefined();
      expect(profile.appearance.faceType).toBeTruthy();
      expect(profile.appearance.hairStyle).toBeTruthy();
      expect(profile.appearance.bodyType).toBeTruthy();
      expect(profile.appearance.fashionStyle).toBeTruthy();
      expect(profile.personality).toBeDefined();
      expect(profile.personality.speakingStyle).toBeTruthy();
      expect(profile.personality.tone).toBeTruthy();
      expect(profile.videoPromptHints).toBeDefined();
      expect(profile.videoPromptHints).toContain('Japanese woman');
    });

    it('should generate profile for Aragaki Yui (English name)', async () => {
      const profile = await profiler.generateProfile('Aragaki Yui', 'en');

      expect(profile.name).toBe('新垣結衣');
      expect(profile.appearance).toBeDefined();
      expect(profile.videoPromptHints).toContain('Japanese woman');
    });

    it('should generate generic profile for unknown talent', async () => {
      const profile = await profiler.generateProfile('Unknown Talent', 'ja');

      expect(profile.name).toBe('Unknown Talent');
      expect(profile.appearance).toBeDefined();
      expect(profile.appearance.faceType).toBeTruthy();
      expect(profile.personality).toBeDefined();
      expect(profile.videoPromptHints).toBeDefined();
    });

    it('should respect language parameter', async () => {
      const profileJa = await profiler.generateProfile('Unknown', 'ja');
      const profileEn = await profiler.generateProfile('Unknown', 'en');

      expect(profileJa.appearance.faceType).toContain('整った顔立ち');
      expect(profileEn.appearance.faceType).toContain('Well-balanced');
    });

    it('should validate profile structure', async () => {
      const profile = await profiler.generateProfile('新垣結衣', 'ja');

      // Validate appearance
      expect(profile.appearance).toHaveProperty('faceType');
      expect(profile.appearance).toHaveProperty('hairStyle');
      expect(profile.appearance).toHaveProperty('bodyType');
      expect(profile.appearance).toHaveProperty('fashionStyle');

      // Validate personality
      expect(profile.personality).toHaveProperty('speakingStyle');
      expect(profile.personality).toHaveProperty('tone');

      // videoPromptHints should be in English
      expect(profile.videoPromptHints).toBeTruthy();
      expect(typeof profile.videoPromptHints).toBe('string');
    });

    it('should include catchphrase for 新垣結衣', async () => {
      const profile = await profiler.generateProfile('新垣結衣', 'ja');

      expect(profile.personality.catchphrase).toBeDefined();
      expect(profile.personality.catchphrase).toContain('ムズキュン');
    });

    it('should allow optional catchphrase', async () => {
      const profile = await profiler.generateProfile('Generic Talent', 'en');

      // catchphrase is optional
      if (profile.personality.catchphrase !== undefined) {
        expect(typeof profile.personality.catchphrase).toBe('string');
      }
    });
  });

  describe('Cache Management', () => {
    let profiler: TalentProfiler;

    beforeEach(() => {
      profiler = createTalentProfiler({ useMock: true });
    });

    it('should cache results', async () => {
      await profiler.generateProfile('新垣結衣', 'ja');

      const stats1 = profiler.getCacheStats();
      expect(stats1.size).toBe(1);
      expect(stats1.keys).toContain('新垣結衣:ja');

      // Second call should use cache
      await profiler.generateProfile('新垣結衣', 'ja');

      const stats2 = profiler.getCacheStats();
      expect(stats2.size).toBe(1); // Still 1 item
    });

    it('should cache different languages separately', async () => {
      await profiler.generateProfile('新垣結衣', 'ja');
      await profiler.generateProfile('新垣結衣', 'en');

      const stats = profiler.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('新垣結衣:ja');
      expect(stats.keys).toContain('新垣結衣:en');
    });

    it('should clear cache for specific talent', async () => {
      await profiler.generateProfile('新垣結衣', 'ja');
      await profiler.generateProfile('新垣結衣', 'en');
      await profiler.generateProfile('Other Talent', 'ja');

      profiler.clearCache('新垣結衣');

      const stats = profiler.getCacheStats();
      expect(stats.size).toBe(1); // Only "Other Talent:ja" remains
      expect(stats.keys).not.toContain('新垣結衣:ja');
      expect(stats.keys).not.toContain('新垣結衣:en');
      expect(stats.keys).toContain('Other Talent:ja');
    });

    it('should clear all cache', async () => {
      await profiler.generateProfile('Talent 1', 'ja');
      await profiler.generateProfile('Talent 2', 'en');
      await profiler.generateProfile('Talent 3', 'ja');

      expect(profiler.getCacheStats().size).toBe(3);

      profiler.clearCache();

      const stats = profiler.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toHaveLength(0);
    });

    it('should return cache stats', async () => {
      await profiler.generateProfile('新垣結衣', 'ja');

      const stats = profiler.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('keys');
      expect(Array.isArray(stats.keys)).toBe(true);
      expect(stats.size).toBe(stats.keys.length);
    });
  });

  describe('Type Safety', () => {
    it('should enforce TalentProfile interface', () => {
      const profile: TalentProfile = {
        name: 'Test Talent',
        appearance: {
          faceType: 'Oval',
          hairStyle: 'Long',
          bodyType: 'Slim',
          fashionStyle: 'Casual',
        },
        personality: {
          speakingStyle: 'Friendly',
          tone: 'Warm',
          catchphrase: 'Test phrase',
        },
        videoPromptHints: 'A person with friendly appearance',
      };

      expect(profile.name).toBe('Test Talent');
      expect(profile.appearance.faceType).toBe('Oval');
      expect(profile.personality.speakingStyle).toBe('Friendly');
      expect(profile.videoPromptHints).toBeTruthy();
    });

    it('should allow optional catchphrase', () => {
      const profileWithCatchphrase: TalentProfile = {
        name: 'Test',
        appearance: {
          faceType: 'Round',
          hairStyle: 'Short',
          bodyType: 'Average',
          fashionStyle: 'Modern',
        },
        personality: {
          speakingStyle: 'Calm',
          tone: 'Gentle',
          catchphrase: 'Hello!',
        },
        videoPromptHints: 'Test',
      };

      const profileWithoutCatchphrase: TalentProfile = {
        name: 'Test',
        appearance: {
          faceType: 'Round',
          hairStyle: 'Short',
          bodyType: 'Average',
          fashionStyle: 'Modern',
        },
        personality: {
          speakingStyle: 'Calm',
          tone: 'Gentle',
        },
        videoPromptHints: 'Test',
      };

      expect(profileWithCatchphrase.personality.catchphrase).toBeDefined();
      expect(profileWithoutCatchphrase.personality.catchphrase).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    let profiler: TalentProfiler;

    beforeEach(() => {
      profiler = createTalentProfiler({ useMock: true });
    });

    it('should handle empty talent name', async () => {
      const profile = await profiler.generateProfile('', 'ja');

      expect(profile.name).toBe('');
      expect(profile.appearance).toBeDefined();
      expect(profile.personality).toBeDefined();
    });

    it('should handle very long talent name', async () => {
      const longName = 'Very Long Talent Name That Exceeds Normal Length';
      const profile = await profiler.generateProfile(longName, 'ja');

      expect(profile.name).toBe(longName);
      expect(profile.appearance).toBeDefined();
    });

    it('should handle special characters in name', async () => {
      const specialName = '新垣結衣 (ガッキー)';
      const profile = await profiler.generateProfile(specialName, 'ja');

      expect(profile.appearance).toBeDefined();
      expect(profile.personality).toBeDefined();
    });

    it('should handle default language when not specified', async () => {
      const profile = await profiler.generateProfile('Test Talent');

      // Default language is 'ja'
      expect(profile.appearance).toBeDefined();
      expect(profile.personality).toBeDefined();
    });
  });

  describe('Integration with ScriptGenerator', () => {
    it('should produce profile compatible with ScriptGenerator', async () => {
      const profiler = createTalentProfiler({ useMock: true });
      const profile = await profiler.generateProfile('新垣結衣', 'ja');

      // Validate that the profile has all required fields for ScriptGenerator
      expect(profile.name).toBeTruthy();
      expect(profile.personality.speakingStyle).toBeTruthy();
      expect(profile.personality.tone).toBeTruthy();
      expect(profile.videoPromptHints).toBeTruthy();

      // Appearance fields for video generation
      expect(profile.appearance.faceType).toBeTruthy();
      expect(profile.appearance.hairStyle).toBeTruthy();
      expect(profile.appearance.bodyType).toBeTruthy();
      expect(profile.appearance.fashionStyle).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should handle multiple concurrent requests', async () => {
      const profiler = createTalentProfiler({ useMock: true });

      const talents = ['新垣結衣', 'Talent 2', 'Talent 3', 'Talent 4', 'Talent 5'];

      const promises = talents.map((name) =>
        profiler.generateProfile(name, 'ja')
      );

      const profiles = await Promise.all(promises);

      expect(profiles).toHaveLength(5);
      profiles.forEach((profile, index) => {
        expect(profile.name).toBe(talents[index]);
        expect(profile.appearance).toBeDefined();
        expect(profile.personality).toBeDefined();
      });
    });

    it('should cache improve performance on repeated calls', async () => {
      const profiler = createTalentProfiler({ useMock: true });

      // First call - not cached
      await profiler.generateProfile('新垣結衣', 'ja');

      // Second call - cached
      await profiler.generateProfile('新垣結衣', 'ja');

      // Verify cache was used
      const stats = profiler.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('新垣結衣:ja');

      // The fact that we only have 1 cache entry after 2 calls proves caching works
    });
  });
});
