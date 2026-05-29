/**
 * Image Input Module
 * Handles image loading, Base64 conversion, and validation
 */

import fs from 'fs/promises';
import axios from 'axios';
import sharp from 'sharp';
import path from 'path';

/**
 * Image data structure containing buffer and metadata
 */
export interface ImageData {
  buffer: Buffer;
  mimeType: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
  filename: string;
}

/**
 * Image validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Image loading and conversion options
 */
export interface ImageInputOptions {
  maxSizeBytes?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Default configuration for image processing
 */
const DEFAULT_OPTIONS: Required<ImageInputOptions> = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  minWidth: 100,
  minHeight: 100,
  maxWidth: 4096,
  maxHeight: 4096,
};

/**
 * Image Input Module for loading and processing images
 * Supports local files and URLs with comprehensive validation
 */
export class ImageInputModule {
  private options: Required<ImageInputOptions>;

  constructor(options: ImageInputOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Load image from local file path
   *
   * @param filePath - Absolute or relative path to image file
   * @returns ImageData with buffer and metadata
   * @throws Error if file doesn't exist or cannot be read
   */
  async loadFromPath(filePath: string): Promise<ImageData> {
    try {
      const buffer = await fs.readFile(filePath);
      const metadata = await sharp(buffer).metadata();

      if (!metadata.width || !metadata.height || !metadata.format) {
        throw new Error('Unable to extract image metadata');
      }

      const mimeType = this.formatToMimeType(metadata.format);
      const filename = path.basename(filePath);

      return {
        buffer,
        mimeType,
        width: metadata.width,
        height: metadata.height,
        filename,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load image from path: ${error.message}`);
      }
      throw new Error('Failed to load image from path: Unknown error');
    }
  }

  /**
   * Load image from URL
   *
   * @param url - HTTP(S) URL to image
   * @returns ImageData with buffer and metadata
   * @throws Error if URL is invalid or image cannot be fetched
   */
  async loadFromUrl(url: string): Promise<ImageData> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 second timeout
        maxContentLength: this.options.maxSizeBytes,
      });

      const buffer = Buffer.from(response.data);
      const metadata = await sharp(buffer).metadata();

      if (!metadata.width || !metadata.height || !metadata.format) {
        throw new Error('Unable to extract image metadata from URL');
      }

      const mimeType = this.formatToMimeType(metadata.format);
      const filename = this.extractFilenameFromUrl(url);

      return {
        buffer,
        mimeType,
        width: metadata.width,
        height: metadata.height,
        filename,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch image from URL: ${error.message}`);
      }
      if (error instanceof Error) {
        throw new Error(`Failed to load image from URL: ${error.message}`);
      }
      throw new Error('Failed to load image from URL: Unknown error');
    }
  }

  /**
   * Convert ImageData to Base64 string
   *
   * @param image - ImageData object
   * @returns Base64-encoded string (without data URI prefix)
   */
  toBase64(image: ImageData): string {
    return image.buffer.toString('base64');
  }

  /**
   * Validate image against configured constraints
   *
   * @param image - ImageData to validate
   * @returns ValidationResult with errors if any
   */
  validate(image: ImageData): ValidationResult {
    const errors: string[] = [];

    // Check file size
    if (image.buffer.length > this.options.maxSizeBytes) {
      const maxMB = (this.options.maxSizeBytes / (1024 * 1024)).toFixed(1);
      const actualMB = (image.buffer.length / (1024 * 1024)).toFixed(1);
      errors.push(`Image size (${actualMB}MB) exceeds maximum allowed size (${maxMB}MB)`);
    }

    // Check dimensions - minimum
    if (image.width < this.options.minWidth || image.height < this.options.minHeight) {
      errors.push(
        `Image dimensions (${image.width}x${image.height}) are smaller than minimum (${this.options.minWidth}x${this.options.minHeight})`
      );
    }

    // Check dimensions - maximum
    if (image.width > this.options.maxWidth || image.height > this.options.maxHeight) {
      errors.push(
        `Image dimensions (${image.width}x${image.height}) exceed maximum (${this.options.maxWidth}x${this.options.maxHeight})`
      );
    }

    // Check format
    if (image.mimeType !== 'image/png' && image.mimeType !== 'image/jpeg') {
      errors.push(`Unsupported image format: ${image.mimeType}. Only PNG and JPEG are supported`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Load and validate image in one operation
   *
   * @param pathOrUrl - File path or URL
   * @returns Validated ImageData
   * @throws Error if validation fails
   */
  async loadAndValidate(pathOrUrl: string): Promise<ImageData> {
    const isUrl = pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://');
    const image = isUrl ? await this.loadFromUrl(pathOrUrl) : await this.loadFromPath(pathOrUrl);

    const validation = this.validate(image);
    if (!validation.valid) {
      throw new Error(`Image validation failed: ${validation.errors.join(', ')}`);
    }

    return image;
  }

  /**
   * Convert sharp format to MIME type
   *
   * @param format - Sharp format string
   * @returns MIME type
   * @throws Error if format is not supported
   */
  private formatToMimeType(format: string): 'image/png' | 'image/jpeg' {
    switch (format.toLowerCase()) {
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      default:
        throw new Error(`Unsupported image format: ${format}. Only PNG and JPEG are supported`);
    }
  }

  /**
   * Extract filename from URL
   *
   * @param url - URL string
   * @returns Extracted filename or default
   */
  private extractFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = path.basename(pathname);
      return filename || 'downloaded-image.jpg';
    } catch {
      return 'downloaded-image.jpg';
    }
  }
}

/**
 * Factory function to create ImageInputModule instance
 *
 * @param options - Optional configuration
 * @returns New ImageInputModule instance
 */
export function createImageInputModule(options?: ImageInputOptions): ImageInputModule {
  return new ImageInputModule(options);
}
