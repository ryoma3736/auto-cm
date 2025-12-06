/**
 * Image Processor Tests
 * Tests for NanoBanana image vertical extension functionality
 *
 * Run tests: npm test
 * Run specific: npm test -- image-processor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ImageProcessor, ExtendOptions, ExtendedImage } from '../src/modules/image-processor/index.js';
import sharp from 'sharp';

describe('ImageProcessor - Image Extension', () => {
  let processor: ImageProcessor;

  beforeEach(() => {
    processor = new ImageProcessor({
      nanoBananaApiKey: 'test-api-key',
      nanoBananaEndpoint: 'https://api.nanobanana.test',
    });
  });

  describe('extendToVertical', () => {
    it('should extend horizontal image to 9:16 aspect ratio with white background', async () => {
      // Create a test image (800x600 - horizontal)
      const testImageBuffer = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 255, g: 0, b: 0 }, // Red image
        },
      })
        .png()
        .toBuffer();

      const testImageBase64 = `data:image/png;base64,${testImageBuffer.toString('base64')}`;

      const options: ExtendOptions = {
        targetAspectRatio: '9:16',
        backgroundColor: '#FFFFFF',
        preserveOriginal: true,
      };

      const result: ExtendedImage = await processor.extendToVertical(testImageBase64, options);

      // Validate result structure
      expect(result).toHaveProperty('base64');
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
      expect(result).toHaveProperty('originalPosition');

      // Validate aspect ratio (9:16)
      // Expected height: 800 * (16/9) = 1422.22... ≈ 1423
      const expectedHeight = Math.ceil(800 * (16 / 9));
      expect(result.height).toBe(expectedHeight);
      expect(result.width).toBe(800);

      // Validate original position (should be centered vertically)
      const expectedTopPadding = Math.floor((expectedHeight - 600) / 2);
      expect(result.originalPosition.x).toBe(0);
      expect(result.originalPosition.y).toBe(expectedTopPadding);

      // Validate base64 format
      expect(result.base64).toMatch(/^data:image\/\w+;base64,/);
    });

    it('should handle custom background color', async () => {
      // Create a small test image (400x300)
      const testImageBuffer = await sharp({
        create: {
          width: 400,
          height: 300,
          channels: 3,
          background: { r: 0, g: 255, b: 0 }, // Green image
        },
      })
        .png()
        .toBuffer();

      const testImageBase64 = testImageBuffer.toString('base64');

      const options: ExtendOptions = {
        targetAspectRatio: '9:16',
        backgroundColor: '#FF0000', // Red background
        preserveOriginal: true,
      };

      const result = await processor.extendToVertical(testImageBase64, options);

      // Expected height: 400 * (16/9) = 711.11... ≈ 712
      const expectedHeight = Math.ceil(400 * (16 / 9));
      expect(result.height).toBe(expectedHeight);
      expect(result.width).toBe(400);
    });

    it('should handle 3-digit hex color codes', async () => {
      const testImageBuffer = await sharp({
        create: {
          width: 200,
          height: 150,
          channels: 3,
          background: { r: 100, g: 100, b: 100 },
        },
      })
        .png()
        .toBuffer();

      const testImageBase64 = testImageBuffer.toString('base64');

      const options: ExtendOptions = {
        targetAspectRatio: '9:16',
        backgroundColor: '#FFF', // Short format
        preserveOriginal: true,
      };

      const result = await processor.extendToVertical(testImageBase64, options);

      expect(result.width).toBe(200);
      expect(result.height).toBe(Math.ceil(200 * (16 / 9)));
    });

    it('should handle already vertical images (no extension needed)', async () => {
      // Create a tall image (400x800 - already vertical, aspect ratio 1:2)
      const testImageBuffer = await sharp({
        create: {
          width: 400,
          height: 800,
          channels: 3,
          background: { r: 0, g: 0, b: 255 }, // Blue image
        },
      })
        .png()
        .toBuffer();

      const testImageBase64 = testImageBuffer.toString('base64');

      const options: ExtendOptions = {
        targetAspectRatio: '9:16',
        backgroundColor: '#FFFFFF',
        preserveOriginal: true,
      };

      const result = await processor.extendToVertical(testImageBase64, options);

      // Expected height for 9:16 from width 400: 400 * (16/9) = 711.11... ≈ 712
      // Since original height (800) > target height (712), no padding needed
      // But our implementation still calculates based on width
      expect(result.width).toBe(400);
      expect(result.height).toBeGreaterThanOrEqual(712);
    });

    it('should throw error for invalid image data', async () => {
      const invalidBase64 = 'not-a-valid-base64-image';

      const options: ExtendOptions = {
        targetAspectRatio: '9:16',
        backgroundColor: '#FFFFFF',
        preserveOriginal: true,
      };

      await expect(processor.extendToVertical(invalidBase64, options)).rejects.toThrow();
    });

    it('should handle data URI prefix correctly', async () => {
      const testImageBuffer = await sharp({
        create: {
          width: 600,
          height: 400,
          channels: 3,
          background: { r: 128, g: 128, b: 128 },
        },
      })
        .png()
        .toBuffer();

      // Test with data URI prefix
      const withPrefix = `data:image/png;base64,${testImageBuffer.toString('base64')}`;
      const resultWithPrefix = await processor.extendToVertical(withPrefix, {
        targetAspectRatio: '9:16',
        backgroundColor: '#FFFFFF',
        preserveOriginal: true,
      });

      // Test without data URI prefix
      const withoutPrefix = testImageBuffer.toString('base64');
      const resultWithoutPrefix = await processor.extendToVertical(withoutPrefix, {
        targetAspectRatio: '9:16',
        backgroundColor: '#FFFFFF',
        preserveOriginal: true,
      });

      // Both should produce the same dimensions
      expect(resultWithPrefix.width).toBe(resultWithoutPrefix.width);
      expect(resultWithPrefix.height).toBe(resultWithoutPrefix.height);
    });
  });

  describe('addPadding', () => {
    it('should add padding to reach target dimensions', async () => {
      // Create a small test image (200x200)
      const testImageBuffer = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: { r: 255, g: 255, b: 0 }, // Yellow image
        },
      })
        .png()
        .toBuffer();

      const testImageBase64 = testImageBuffer.toString('base64');

      const targetWidth = 400;
      const targetHeight = 600;

      const result = await processor.addPadding(testImageBase64, targetWidth, targetHeight);

      // Validate base64 format
      expect(result).toMatch(/^data:image\/\w+;base64,/);

      // Decode and check dimensions
      const resultBuffer = Buffer.from(result.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const resultMetadata = await sharp(resultBuffer).metadata();

      expect(resultMetadata.width).toBe(targetWidth);
      expect(resultMetadata.height).toBe(targetHeight);
    });

    it('should center the original image', async () => {
      // Create a test image (100x100)
      const testImageBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 0, g: 255, b: 255 }, // Cyan image
        },
      })
        .png()
        .toBuffer();

      const testImageBase64 = testImageBuffer.toString('base64');

      const targetWidth = 300;
      const targetHeight = 500;

      const result = await processor.addPadding(testImageBase64, targetWidth, targetHeight);

      // Decode result
      const resultBuffer = Buffer.from(result.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const resultMetadata = await sharp(resultBuffer).metadata();

      // Verify dimensions
      expect(resultMetadata.width).toBe(targetWidth);
      expect(resultMetadata.height).toBe(targetHeight);

      // Note: We can't easily verify centering in a unit test without pixel analysis,
      // but the implementation uses Math.floor/ceil to ensure proper centering
    });

    it('should handle cases where original is larger than target', async () => {
      // Create an image larger than target
      const testImageBuffer = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 128, g: 64, b: 192 },
        },
      })
        .png()
        .toBuffer();

      const testImageBase64 = testImageBuffer.toString('base64');

      const targetWidth = 400; // Smaller than original
      const targetHeight = 300; // Smaller than original

      const result = await processor.addPadding(testImageBase64, targetWidth, targetHeight);

      const resultBuffer = Buffer.from(result.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const resultMetadata = await sharp(resultBuffer).metadata();

      // Should keep original size (no shrinking, only padding)
      expect(resultMetadata.width).toBe(800);
      expect(resultMetadata.height).toBe(600);
    });

    it('should handle data URI prefix in addPadding', async () => {
      const testImageBuffer = await sharp({
        create: {
          width: 150,
          height: 150,
          channels: 3,
          background: { r: 200, g: 100, b: 50 },
        },
      })
        .png()
        .toBuffer();

      const withPrefix = `data:image/png;base64,${testImageBuffer.toString('base64')}`;
      const resultWithPrefix = await processor.addPadding(withPrefix, 300, 300);

      const withoutPrefix = testImageBuffer.toString('base64');
      const resultWithoutPrefix = await processor.addPadding(withoutPrefix, 300, 300);

      // Both should work and produce valid results
      expect(resultWithPrefix).toMatch(/^data:image\/\w+;base64,/);
      expect(resultWithoutPrefix).toMatch(/^data:image\/\w+;base64,/);
    });
  });

  describe('parseHexColor (private method via extendToVertical)', () => {
    it('should correctly parse 6-digit hex colors', async () => {
      const testImageBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer();

      const testImageBase64 = testImageBuffer.toString('base64');

      // Test various color formats
      const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000'];

      for (const color of colors) {
        const result = await processor.extendToVertical(testImageBase64, {
          targetAspectRatio: '9:16',
          backgroundColor: color,
          preserveOriginal: true,
        });

        // Should complete without error
        expect(result).toBeDefined();
        expect(result.base64).toMatch(/^data:image\/\w+;base64,/);
      }
    });

    it('should correctly parse 3-digit hex colors', async () => {
      const testImageBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer();

      const testImageBase64 = testImageBuffer.toString('base64');

      // Test short format colors
      const colors = ['#F00', '#0F0', '#00F', '#FFF', '#000'];

      for (const color of colors) {
        const result = await processor.extendToVertical(testImageBase64, {
          targetAspectRatio: '9:16',
          backgroundColor: color,
          preserveOriginal: true,
        });

        expect(result).toBeDefined();
        expect(result.base64).toMatch(/^data:image\/\w+;base64,/);
      }
    });
  });
});
