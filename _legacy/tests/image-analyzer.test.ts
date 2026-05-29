/**
 * Image Analyzer Module Tests
 *
 * Tests for image loading, Base64 conversion, and validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ImageInputModule, ImageData } from '../src/modules/image-analyzer/index.js';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

// Test fixtures directory
const FIXTURES_DIR = path.join(import.meta.dirname, 'fixtures');

/**
 * Create test fixture images
 */
async function setupTestFixtures(): Promise<void> {
  await fs.mkdir(FIXTURES_DIR, { recursive: true });

  // Create valid PNG (200x200)
  await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .png()
    .toFile(path.join(FIXTURES_DIR, 'valid.png'));

  // Create valid JPEG (300x300)
  await sharp({
    create: {
      width: 300,
      height: 300,
      channels: 3,
      background: { r: 0, g: 255, b: 0 },
    },
  })
    .jpeg()
    .toFile(path.join(FIXTURES_DIR, 'valid.jpg'));

  // Create too small image (50x50)
  await sharp({
    create: {
      width: 50,
      height: 50,
      channels: 3,
      background: { r: 0, g: 0, b: 255 },
    },
  })
    .png()
    .toFile(path.join(FIXTURES_DIR, 'too-small.png'));

  // Create large valid image (1000x1000)
  await sharp({
    create: {
      width: 1000,
      height: 1000,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  })
    .png()
    .toFile(path.join(FIXTURES_DIR, 'large.png'));
}

/**
 * Clean up test fixtures
 */
async function cleanupTestFixtures(): Promise<void> {
  try {
    await fs.rm(FIXTURES_DIR, { recursive: true, force: true });
  } catch {
    // Ignore errors during cleanup
  }
}

describe('ImageInputModule', () => {
  let module: ImageInputModule;

  beforeAll(async () => {
    await setupTestFixtures();
    module = new ImageInputModule();
  });

  afterAll(async () => {
    await cleanupTestFixtures();
  });

  describe('loadFromPath', () => {
    it('should load valid PNG image', async () => {
      const image = await module.loadFromPath(path.join(FIXTURES_DIR, 'valid.png'));

      expect(image).toBeDefined();
      expect(image.mimeType).toBe('image/png');
      expect(image.width).toBe(200);
      expect(image.height).toBe(200);
      expect(image.filename).toBe('valid.png');
      expect(image.buffer).toBeInstanceOf(Buffer);
      expect(image.buffer.length).toBeGreaterThan(0);
    });

    it('should load valid JPEG image', async () => {
      const image = await module.loadFromPath(path.join(FIXTURES_DIR, 'valid.jpg'));

      expect(image).toBeDefined();
      expect(image.mimeType).toBe('image/jpeg');
      expect(image.width).toBe(300);
      expect(image.height).toBe(300);
      expect(image.filename).toBe('valid.jpg');
      expect(image.buffer).toBeInstanceOf(Buffer);
    });

    it('should throw error for non-existent file', async () => {
      await expect(
        module.loadFromPath(path.join(FIXTURES_DIR, 'non-existent.png'))
      ).rejects.toThrow('Failed to load image from path');
    });

    it('should throw error for invalid image file', async () => {
      // Create invalid file
      const invalidPath = path.join(FIXTURES_DIR, 'invalid.png');
      await fs.writeFile(invalidPath, 'not an image');

      await expect(module.loadFromPath(invalidPath)).rejects.toThrow();

      await fs.unlink(invalidPath);
    });
  });

  describe('toBase64', () => {
    it('should convert image to Base64 string', async () => {
      const image = await module.loadFromPath(path.join(FIXTURES_DIR, 'valid.png'));
      const base64 = module.toBase64(image);

      expect(base64).toBeDefined();
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
      // Base64 strings should only contain valid characters
      expect(base64).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should produce different Base64 for different images', async () => {
      const png = await module.loadFromPath(path.join(FIXTURES_DIR, 'valid.png'));
      const jpg = await module.loadFromPath(path.join(FIXTURES_DIR, 'valid.jpg'));

      const base64Png = module.toBase64(png);
      const base64Jpg = module.toBase64(jpg);

      expect(base64Png).not.toBe(base64Jpg);
    });

    it('should be reversible', async () => {
      const image = await module.loadFromPath(path.join(FIXTURES_DIR, 'valid.png'));
      const base64 = module.toBase64(image);
      const decodedBuffer = Buffer.from(base64, 'base64');

      expect(decodedBuffer).toEqual(image.buffer);
    });
  });

  describe('validate', () => {
    it('should validate correct PNG image', async () => {
      const image = await module.loadFromPath(path.join(FIXTURES_DIR, 'valid.png'));
      const validation = module.validate(image);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate correct JPEG image', async () => {
      const image = await module.loadFromPath(path.join(FIXTURES_DIR, 'valid.jpg'));
      const validation = module.validate(image);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject image that is too small', async () => {
      const image = await module.loadFromPath(path.join(FIXTURES_DIR, 'too-small.png'));
      const validation = module.validate(image);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('smaller than minimum');
    });

    it('should reject image that exceeds size limit', async () => {
      const smallModule = new ImageInputModule({ maxSizeBytes: 1000 }); // Very small limit
      const image = await module.loadFromPath(path.join(FIXTURES_DIR, 'large.png'));
      const validation = smallModule.validate(image);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('exceeds maximum allowed size');
    });

    it('should reject image with dimensions too large', async () => {
      const restrictiveModule = new ImageInputModule({
        maxWidth: 500,
        maxHeight: 500,
      });
      const image = await module.loadFromPath(path.join(FIXTURES_DIR, 'large.png'));
      const validation = restrictiveModule.validate(image);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('exceed maximum');
    });
  });

  describe('loadAndValidate', () => {
    it('should load and validate valid image', async () => {
      const image = await module.loadAndValidate(path.join(FIXTURES_DIR, 'valid.png'));

      expect(image).toBeDefined();
      expect(image.mimeType).toBe('image/png');
    });

    it('should throw error for invalid image', async () => {
      await expect(
        module.loadAndValidate(path.join(FIXTURES_DIR, 'too-small.png'))
      ).rejects.toThrow('Image validation failed');
    });
  });

  describe('Custom options', () => {
    it('should respect custom size limits', () => {
      const customModule = new ImageInputModule({
        minWidth: 500,
        minHeight: 500,
        maxWidth: 2000,
        maxHeight: 2000,
      });

      expect(customModule).toBeDefined();
    });

    it('should use custom validation constraints', async () => {
      const customModule = new ImageInputModule({
        minWidth: 500,
        minHeight: 500,
      });

      const image = await module.loadFromPath(path.join(FIXTURES_DIR, 'valid.png'));
      const validation = customModule.validate(image);

      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('smaller than minimum');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty buffer gracefully', () => {
      const emptyImage: ImageData = {
        buffer: Buffer.alloc(0),
        mimeType: 'image/png',
        width: 200,
        height: 200,
        filename: 'empty.png',
      };

      const base64 = module.toBase64(emptyImage);
      expect(base64).toBe('');
    });

    it('should handle very large Base64 strings', async () => {
      const image = await module.loadFromPath(path.join(FIXTURES_DIR, 'large.png'));
      const base64 = module.toBase64(image);

      expect(base64.length).toBeGreaterThan(1000);
    });
  });
});

describe('URL Loading (requires network)', () => {
  const module = new ImageInputModule();

  // Skip these tests in CI or when network is unavailable
  describe.skip('loadFromUrl', () => {
    it('should load image from URL', async () => {
      // Using a reliable test image URL
      const url = 'https://via.placeholder.com/200';
      const image = await module.loadFromUrl(url);

      expect(image).toBeDefined();
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
      expect(image.buffer).toBeInstanceOf(Buffer);
    });

    it('should handle invalid URL gracefully', async () => {
      await expect(module.loadFromUrl('https://invalid-url-that-does-not-exist.com/image.png')).rejects.toThrow(
        'Failed to fetch image from URL'
      );
    });
  });
});
