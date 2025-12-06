/**
 * Unit Tests for Script Generator Module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ScriptGenerator,
  createScriptGenerator,
  type Persona,
  type UGCScript,
  type Scene,
} from '../../src/modules/script-generator/index.js';
import type { ProductAnalysis } from '../../src/modules/image-analyzer/vision-analyzer.js';

// Mock OpenAI client
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn(),
        },
      };
    },
  };
});

describe('ScriptGenerator', () => {
  let generator: ScriptGenerator;
  let mockProductAnalysis: ProductAnalysis;

  beforeEach(() => {
    // Create generator with mock API key
    generator = new ScriptGenerator({ apiKey: 'test-api-key' });

    // Mock product analysis
    mockProductAnalysis = {
      productType: 'lipstick',
      productName: 'ヴィンテージローズリップ',
      colors: ['ローズピンク', 'ヌードベージュ'],
      features: ['保湿成分配合', '長時間持続', 'マット仕上げ'],
      targetAudience: '20-30代の働く女性',
      mood: ['エレガント', 'ナチュラル', '高級感'],
      brandStyle: '高級感とモダンさを兼ね備えたブランド',
      rawDescription: '高級感のあるローズカラーのリップスティック',
    };
  });

  describe('Constructor', () => {
    it('should create instance with default options', () => {
      expect(generator).toBeInstanceOf(ScriptGenerator);
    });

    it('should throw error when no API key provided', () => {
      // Remove environment variable
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      expect(() => new ScriptGenerator()).toThrow('ScriptGenerator requires OPENAI_API_KEY');

      // Restore environment variable
      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      }
    });

    it('should use environment variable for API key', () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'env-api-key';

      expect(() => new ScriptGenerator()).not.toThrow();

      // Restore
      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    });
  });

  describe('generatePersona', () => {
    it('should generate valid persona from product analysis', async () => {
      // Mock OpenAI response
      const mockPersona = {
        name: '美咲',
        age: 28,
        occupation: 'IT企業勤務',
        personality: ['ポジティブ', '行動的', 'トレンドに敏感'],
        speakingStyle: '友達に話すようなカジュアルで親しみやすい口調',
        painPoints: ['忙しくてメイク時間が取れない', '長持ちするリップを探している'],
        lifestyle: '仕事が忙しく、スキンケアは時短重視',
      };

      vi.spyOn(generator['openai'].chat.completions, 'create').mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockPersona),
            },
          },
        ],
      } as any);

      const persona = await generator.generatePersona(mockProductAnalysis);

      expect(persona).toBeDefined();
      expect(persona.name).toBe('美咲');
      expect(persona.age).toBe(28);
      expect(persona.occupation).toBe('IT企業勤務');
      expect(persona.personality).toEqual(['ポジティブ', '行動的', 'トレンドに敏感']);
      expect(persona.painPoints).toHaveLength(2);
    });

    it('should handle partial persona data', async () => {
      // Mock partial response
      const mockPartialPersona = {
        name: '美咲',
        age: 28,
        // Missing other fields
      };

      vi.spyOn(generator['openai'].chat.completions, 'create').mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockPartialPersona),
            },
          },
        ],
      } as any);

      const persona = await generator.generatePersona(mockProductAnalysis);

      expect(persona.name).toBe('美咲');
      expect(persona.age).toBe(28);
      expect(persona.occupation).toBe('会社員'); // Default value
      expect(persona.personality).toEqual([]); // Empty array for missing
    });

    it('should retry on API failure', async () => {
      const mockError = new Error('API Error');
      const mockSuccess = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                name: '美咲',
                age: 28,
                occupation: 'IT企業勤務',
                personality: [],
                speakingStyle: 'カジュアル',
                painPoints: [],
                lifestyle: '忙しい',
              }),
            },
          },
        ],
      };

      const createSpy = vi
        .spyOn(generator['openai'].chat.completions, 'create')
        .mockRejectedValueOnce(mockError) // First attempt fails
        .mockResolvedValueOnce(mockSuccess as any); // Second attempt succeeds

      const persona = await generator.generatePersona(mockProductAnalysis);

      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(persona.name).toBe('美咲');
    });

    it('should throw error after max retries', async () => {
      const mockError = new Error('API Error');

      vi.spyOn(generator['openai'].chat.completions, 'create').mockRejectedValue(mockError);

      await expect(generator.generatePersona(mockProductAnalysis)).rejects.toThrow(
        'Persona generation failed after 3 attempts'
      );
    });
  });

  describe('generateScript', () => {
    let mockPersona: Persona;

    beforeEach(() => {
      mockPersona = {
        name: '美咲',
        age: 28,
        occupation: 'IT企業勤務',
        personality: ['ポジティブ', '行動的'],
        speakingStyle: 'カジュアルで親しみやすい',
        painPoints: ['メイク時間がない', 'リップの持ちが悪い'],
        lifestyle: '忙しい日常',
      };
    });

    it('should generate valid UGC script', async () => {
      const mockScript = {
        totalDuration: 12,
        scenes: [
          {
            sceneNumber: 1,
            timeCode: '00:00-00:03',
            durationSeconds: 3,
            narration: 'これ、最近買ったリップなんだけど、めちゃくちゃ良い!',
            emotion: 'excited',
            cameraDirection: 'close-up',
            visualDescription:
              'Young woman holding a rose-colored lipstick, smiling excitedly at the camera',
          },
          {
            sceneNumber: 2,
            timeCode: '00:03-00:07',
            durationSeconds: 4,
            narration: '色がすごく綺麗で、しかも長時間落ちないの',
            emotion: 'confident',
            cameraDirection: 'medium shot',
            visualDescription: 'Close-up of applying the lipstick, showing the smooth texture',
          },
          {
            sceneNumber: 3,
            timeCode: '00:07-00:12',
            durationSeconds: 5,
            narration: '朝つけて夕方まで全然崩れない。これはリピ確定!',
            emotion: 'satisfied',
            cameraDirection: 'selfie angle',
            visualDescription: 'Smiling woman showing off her lip color, looking satisfied',
          },
        ],
        sora2Prompt:
          'A 12-second UGC-style video of a young woman introducing her favorite lipstick to friends. Scene 1: Close-up of excited woman holding rose-colored lipstick. Scene 2: Medium shot of applying lipstick smoothly. Scene 3: Selfie angle showing satisfied smile with perfect lip color. Natural lighting, casual smartphone recording style.',
      };

      vi.spyOn(generator['openai'].chat.completions, 'create').mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockScript),
            },
          },
        ],
      } as any);

      const script = await generator.generateScript(mockPersona, mockProductAnalysis);

      expect(script).toBeDefined();
      expect(script.totalDuration).toBe(12);
      expect(script.scenes).toHaveLength(3);
      expect(script.sora2Prompt).toBeTruthy();
    });

    it('should validate scene count (3-4 scenes)', async () => {
      const mockInvalidScript = {
        totalDuration: 12,
        scenes: [
          {
            sceneNumber: 1,
            timeCode: '00:00-00:06',
            durationSeconds: 6,
            narration: 'Test',
            emotion: 'neutral',
            cameraDirection: 'medium shot',
            visualDescription: 'Test',
          },
          {
            sceneNumber: 2,
            timeCode: '00:06-00:12',
            durationSeconds: 6,
            narration: 'Test',
            emotion: 'neutral',
            cameraDirection: 'medium shot',
            visualDescription: 'Test',
          },
        ], // Only 2 scenes - invalid
        sora2Prompt: 'Test prompt',
      };

      vi.spyOn(generator['openai'].chat.completions, 'create').mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockInvalidScript),
            },
          },
        ],
      } as any);

      await expect(generator.generateScript(mockPersona, mockProductAnalysis)).rejects.toThrow(
        'Script must have 3-4 scenes'
      );
    });

    it('should handle scene duration validation', async () => {
      const mockScript = {
        totalDuration: 12,
        scenes: [
          {
            sceneNumber: 1,
            timeCode: '00:00-00:05',
            durationSeconds: 5,
            narration: 'Test',
            emotion: 'neutral',
            cameraDirection: 'medium shot',
            visualDescription: 'Test',
          },
          {
            sceneNumber: 2,
            timeCode: '00:05-00:09',
            durationSeconds: 4,
            narration: 'Test',
            emotion: 'neutral',
            cameraDirection: 'medium shot',
            visualDescription: 'Test',
          },
          {
            sceneNumber: 3,
            timeCode: '00:09-00:15',
            durationSeconds: 6, // Total = 15s, not 12s
            narration: 'Test',
            emotion: 'neutral',
            cameraDirection: 'medium shot',
            visualDescription: 'Test',
          },
        ],
        sora2Prompt: 'Test prompt',
      };

      // Mock console.warn to capture warning
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.spyOn(generator['openai'].chat.completions, 'create').mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockScript),
            },
          },
        ],
      } as any);

      const script = await generator.generateScript(mockPersona, mockProductAnalysis);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Total duration is 15s, expected 12s')
      );
      expect(script.totalDuration).toBe(12); // Still returns 12

      warnSpy.mockRestore();
    });
  });

  describe('generateFullScript', () => {
    it('should generate both persona and script', async () => {
      const mockPersona = {
        name: '美咲',
        age: 28,
        occupation: 'IT企業勤務',
        personality: ['ポジティブ'],
        speakingStyle: 'カジュアル',
        painPoints: ['時間がない'],
        lifestyle: '忙しい',
      };

      const mockScript = {
        totalDuration: 12,
        scenes: [
          {
            sceneNumber: 1,
            timeCode: '00:00-00:04',
            durationSeconds: 4,
            narration: 'Test 1',
            emotion: 'excited',
            cameraDirection: 'close-up',
            visualDescription: 'Scene 1',
          },
          {
            sceneNumber: 2,
            timeCode: '00:04-00:08',
            durationSeconds: 4,
            narration: 'Test 2',
            emotion: 'calm',
            cameraDirection: 'medium shot',
            visualDescription: 'Scene 2',
          },
          {
            sceneNumber: 3,
            timeCode: '00:08-00:12',
            durationSeconds: 4,
            narration: 'Test 3',
            emotion: 'satisfied',
            cameraDirection: 'selfie',
            visualDescription: 'Scene 3',
          },
        ],
        sora2Prompt: 'Full video prompt',
      };

      const createSpy = vi
        .spyOn(generator['openai'].chat.completions, 'create')
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockPersona) } }],
        } as any)
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockScript) } }],
        } as any);

      const result = await generator.generateFullScript(mockProductAnalysis);

      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(result.persona).toBeDefined();
      expect(result.persona.name).toBe('美咲');
      expect(result.script).toBeDefined();
      expect(result.script.scenes).toHaveLength(3);
      expect(result.script.sora2Prompt).toBe('Full video prompt');
    });
  });

  describe('Factory function', () => {
    it('should create ScriptGenerator instance', () => {
      const instance = createScriptGenerator({ apiKey: 'test-key' });
      expect(instance).toBeInstanceOf(ScriptGenerator);
    });
  });
});
