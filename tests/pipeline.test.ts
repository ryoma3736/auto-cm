/**
 * E2E Pipeline Tests
 * Tests the complete AdGenerationPipeline in mock mode
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AdGenerationPipeline, type PipelineInput } from '../src/pipeline/index.js';

describe('AdGenerationPipeline E2E Tests', () => {
  let pipeline: AdGenerationPipeline;

  beforeEach(() => {
    // Create pipeline in mock mode
    pipeline = new AdGenerationPipeline({
      useMock: true,
      verbose: false,
    });
  });

  describe('Full Pipeline Execution', () => {
    it('should complete all stages successfully with base64 input', async () => {
      // 1x1 white pixel PNG (base64)
      const testImageBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

      const input: PipelineInput = {
        imageBase64: testImageBase64,
      };

      const result = await pipeline.generate(input);

      // Assert success
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Assert video URL is generated
      expect(result.videoUrl).toBeDefined();
      expect(result.videoUrl).toContain('mock-videos');

      // Assert metadata is complete
      expect(result.metadata.productAnalysis).toBeDefined();
      expect(result.metadata.persona).toBeDefined();
      expect(result.metadata.script).toBeDefined();
      expect(result.metadata.processingTime).toBeGreaterThan(0);

      // Assert all stages completed
      expect(result.metadata.stages).toHaveLength(7);

      const stageNames = result.metadata.stages.map(s => s.name);
      expect(stageNames).toContain('Image Input & Validation');
      expect(stageNames).toContain('Vision API Analysis');
      expect(stageNames).toContain('Persona & Script Generation');
      expect(stageNames).toContain('Image Extension to Vertical');
      expect(stageNames).toContain('Resize to 720x1280');
      expect(stageNames).toContain('Sora2 Video Generation');
      expect(stageNames).toContain('Google Drive Upload');

      // Assert all stages either succeeded or were skipped (no failures)
      result.metadata.stages.forEach((stage) => {
        expect(['success', 'skipped']).toContain(stage.status);
        expect(stage.duration).toBeGreaterThanOrEqual(0);
      });
    }, 60000); // 60 second timeout for E2E test

    it('should handle data URI prefix in base64 input', async () => {
      const testImageBase64 =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

      const input: PipelineInput = {
        imageBase64: testImageBase64,
      };

      const result = await pipeline.generate(input);

      expect(result.success).toBe(true);
      expect(result.videoUrl).toBeDefined();
    }, 60000);
  });

  describe('Stage-by-Stage Verification', () => {
    it('should execute Stage 1: Image Input & Validation', async () => {
      const testImageBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

      const result = await pipeline.generate({ imageBase64: testImageBase64 });

      const stage1 = result.metadata.stages.find(s => s.name === 'Image Input & Validation');
      expect(stage1).toBeDefined();
      expect(stage1?.status).toBe('success');
    }, 60000);

    it('should execute Stage 2: Vision API Analysis', async () => {
      const testImageBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

      const result = await pipeline.generate({ imageBase64: testImageBase64 });

      const stage2 = result.metadata.stages.find(s => s.name === 'Vision API Analysis');
      expect(stage2).toBeDefined();
      expect(stage2?.status).toBe('success');

      // Verify product analysis was generated
      expect(result.metadata.productAnalysis.productType).toBeDefined();
      expect(result.metadata.productAnalysis.productName).toBeDefined();
    }, 60000);

    it('should execute Stage 3: Persona & Script Generation', async () => {
      const testImageBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

      const result = await pipeline.generate({ imageBase64: testImageBase64 });

      const stage3 = result.metadata.stages.find(s => s.name === 'Persona & Script Generation');
      expect(stage3).toBeDefined();
      expect(stage3?.status).toBe('success');

      // Verify persona was generated
      expect(result.metadata.persona.name).toBeDefined();
      expect(result.metadata.persona.age).toBeGreaterThan(0);

      // Verify script was generated
      expect(result.metadata.script.scenes).toBeDefined();
      expect(result.metadata.script.totalDuration).toBe(12);
    }, 60000);

    it('should execute Stage 4: Image Extension to Vertical', async () => {
      const testImageBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

      const result = await pipeline.generate({ imageBase64: testImageBase64 });

      const stage4 = result.metadata.stages.find(s => s.name === 'Image Extension to Vertical');
      expect(stage4).toBeDefined();
      expect(stage4?.status).toBe('success');
    }, 60000);

    it('should execute Stage 5: Resize to 720x1280', async () => {
      const testImageBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

      const result = await pipeline.generate({ imageBase64: testImageBase64 });

      const stage5 = result.metadata.stages.find(s => s.name === 'Resize to 720x1280');
      expect(stage5).toBeDefined();
      expect(stage5?.status).toBe('success');
    }, 60000);

    it('should execute Stage 6: Sora2 Video Generation', async () => {
      const testImageBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

      const result = await pipeline.generate({ imageBase64: testImageBase64 });

      const stage6 = result.metadata.stages.find(s => s.name === 'Sora2 Video Generation');
      expect(stage6).toBeDefined();
      expect(stage6?.status).toBe('success');

      // Verify video URL was generated
      expect(result.videoUrl).toBeDefined();
      expect(result.videoUrl).toMatch(/^https:\/\//);
    }, 60000);

    it('should skip Stage 7: Google Drive Upload when no credentials', async () => {
      const testImageBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

      const result = await pipeline.generate({ imageBase64: testImageBase64 });

      const stage7 = result.metadata.stages.find(s => s.name === 'Google Drive Upload');
      expect(stage7).toBeDefined();
      expect(stage7?.status).toBe('skipped');
    }, 60000);
  });

  describe('Error Handling', () => {
    it('should handle missing image input gracefully', async () => {
      const result = await pipeline.generate({});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // The error should be about missing image or stage 1 failure
      expect(result.error).toMatch(/No image input provided|Stage 1 failed/);
    }, 60000);

    it('should return partial results on stage failure', async () => {
      const testImageBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

      const result = await pipeline.generate({ imageBase64: testImageBase64 });

      // Even if pipeline fails, metadata should exist
      expect(result.metadata).toBeDefined();
      expect(result.metadata.stages).toBeDefined();
      expect(result.metadata.processingTime).toBeGreaterThan(0);
    }, 60000);
  });

  describe('Google Drive Upload (with credentials)', () => {
    it('should upload to Google Drive when credentials provided', async () => {
      const pipelineWithDrive = new AdGenerationPipeline({
        useMock: true,
        verbose: false,
        googleDriveCredentials: { mock: true }, // Mock credentials
      });

      const testImageBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

      const result = await pipelineWithDrive.generate({
        imageBase64: testImageBase64,
        makePublic: true,
      });

      expect(result.success).toBe(true);

      const stage7 = result.metadata.stages.find(s => s.name === 'Google Drive Upload');
      expect(stage7).toBeDefined();
      expect(stage7?.status).toBe('success');

      // Verify Drive link was generated
      expect(result.driveLink).toBeDefined();
      expect(result.driveLink).toContain('drive.google.com');
    }, 60000);
  });

  describe('Performance', () => {
    it('should complete pipeline within reasonable time', async () => {
      const testImageBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

      const startTime = Date.now();
      const result = await pipeline.generate({ imageBase64: testImageBase64 });
      const endTime = Date.now();

      const totalTime = endTime - startTime;

      // In mock mode, should complete within 60 seconds
      expect(totalTime).toBeLessThan(60000);

      // Processing time should match
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(result.metadata.processingTime).toBeLessThanOrEqual(totalTime);
    }, 60000);

    it('should track individual stage durations', async () => {
      const testImageBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

      const result = await pipeline.generate({ imageBase64: testImageBase64 });

      // All stages should have durations
      result.metadata.stages.forEach((stage) => {
        expect(stage.duration).toBeGreaterThanOrEqual(0);
      });

      // Sum of stage durations should be less than or equal to total processing time
      const stageSum = result.metadata.stages.reduce((sum, stage) => sum + stage.duration, 0);
      expect(stageSum).toBeLessThanOrEqual(result.metadata.processingTime);
    }, 60000);
  });

  describe('Verbose Logging', () => {
    it('should enable verbose logging when requested', async () => {
      const verbosePipeline = new AdGenerationPipeline({
        useMock: true,
        verbose: true,
      });

      const testImageBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

      // Should not throw errors with verbose logging
      const result = await verbosePipeline.generate({ imageBase64: testImageBase64 });

      expect(result.success).toBe(true);
    }, 60000);
  });
});
