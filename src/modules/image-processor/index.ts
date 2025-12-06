/**
 * Image Processor Module
 * Processes images using NanoBanana API and Sharp
 */

import sharp from 'sharp';

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
}

export interface ProcessedImage {
  path: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface ImageProcessorConfig {
  nanoBananaApiKey: string;
  nanoBananaEndpoint: string;
}

/**
 * Options for extending an image to vertical format (9:16)
 */
export interface ExtendOptions {
  targetAspectRatio: '9:16';
  backgroundColor: string; // Default: '#FFFFFF'
  preserveOriginal: boolean;
}

/**
 * Result of extending an image
 */
export interface ExtendedImage {
  base64: string;
  width: number;
  height: number;
  originalPosition: { x: number; y: number };
}

/**
 * Options for resizing an image
 */
export interface ResizeOptions {
  width: number;
  height: number;
  quality?: number; // 1-100, default 90
  format?: 'png' | 'jpeg' | 'webp';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

/**
 * Result of resizing an image
 */
export interface ResizedImage {
  base64: string;
  width: number;
  height: number;
  format: string;
  sizeBytes: number;
}

/**
 * Interface for image resizing functionality
 */
export interface ImageResizer {
  resize(imageBase64: string, options: ResizeOptions): Promise<ResizedImage>;
  resizeTo720x1280(imageBase64: string): Promise<ResizedImage>;
}

/**
 * Interface for image extension functionality
 */
export interface ImageExtender {
  extendToVertical(imageBase64: string, options: ExtendOptions): Promise<ExtendedImage>;
  addPadding(imageBase64: string, targetWidth: number, targetHeight: number): Promise<string>;
}

export class ImageProcessor implements ImageExtender, ImageResizer {
  private config: ImageProcessorConfig;

  constructor(config: ImageProcessorConfig) {
    this.config = config;
  }

  /**
   * Resize and optimize an image
   */
  async processImage(
    _inputPath: string,
    _outputPath: string,
    _options: ImageProcessingOptions = {}
  ): Promise<ProcessedImage> {
    // TODO: Implement image processing with Sharp
    throw new Error('Not implemented yet');
  }

  /**
   * Generate additional images using NanoBanana API
   */
  async generateImage(_prompt: string, _outputPath: string): Promise<ProcessedImage> {
    // TODO: Implement image generation using NanoBanana API
    throw new Error('Not implemented yet');
  }

  /**
   * Batch process multiple images
   */
  async processImages(
    _inputs: Array<{ inputPath: string; outputPath: string; options?: ImageProcessingOptions }>
  ): Promise<ProcessedImage[]> {
    // TODO: Implement batch processing
    throw new Error('Not implemented yet');
  }

  /**
   * Extend an image to vertical (9:16) format using local fallback with sharp
   * Centers the original image and fills remaining space with background color
   *
   * @param imageBase64 - Base64 encoded image string
   * @param options - Extension options (aspect ratio, background color, etc.)
   * @returns Extended image with metadata
   */
  async extendToVertical(imageBase64: string, options: ExtendOptions): Promise<ExtendedImage> {
    // Remove data URI prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Get original image metadata
    const metadata = await sharp(imageBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to read image dimensions');
    }

    const originalWidth = metadata.width;
    const originalHeight = metadata.height;

    // Calculate target dimensions for 9:16 aspect ratio
    // Target height should be (width * 16) / 9
    const targetHeight = Math.ceil(originalWidth * (16 / 9));

    // Calculate padding needed (top and bottom)
    const totalPadding = Math.max(0, targetHeight - originalHeight);
    const topPadding = Math.floor(totalPadding / 2);
    const bottomPadding = Math.ceil(totalPadding / 2);

    // Parse background color (hex to RGB)
    const bgColor = this.parseHexColor(options.backgroundColor || '#FFFFFF');

    // Extend the image with sharp
    const extendedBuffer = await sharp(imageBuffer)
      .extend({
        top: topPadding,
        bottom: bottomPadding,
        left: 0,
        right: 0,
        background: bgColor,
      })
      .toBuffer();

    // Convert result to base64
    const resultBase64 = extendedBuffer.toString('base64');
    const resultMetadata = await sharp(extendedBuffer).metadata();

    return {
      base64: `data:image/${metadata.format || 'png'};base64,${resultBase64}`,
      width: resultMetadata.width || originalWidth,
      height: resultMetadata.height || targetHeight,
      originalPosition: {
        x: 0,
        y: topPadding,
      },
    };
  }

  /**
   * Add padding to an image to reach target dimensions
   * Centers the image and fills with white background
   *
   * @param imageBase64 - Base64 encoded image string
   * @param targetWidth - Target width in pixels
   * @param targetHeight - Target height in pixels
   * @returns Base64 encoded padded image
   */
  async addPadding(imageBase64: string, targetWidth: number, targetHeight: number): Promise<string> {
    // Remove data URI prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Get original image metadata
    const metadata = await sharp(imageBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to read image dimensions');
    }

    const originalWidth = metadata.width;
    const originalHeight = metadata.height;

    // Calculate padding needed
    const horizontalPadding = Math.max(0, targetWidth - originalWidth);
    const verticalPadding = Math.max(0, targetHeight - originalHeight);

    const leftPadding = Math.floor(horizontalPadding / 2);
    const rightPadding = Math.ceil(horizontalPadding / 2);
    const topPadding = Math.floor(verticalPadding / 2);
    const bottomPadding = Math.ceil(verticalPadding / 2);

    // Extend the image with white background
    const paddedBuffer = await sharp(imageBuffer)
      .extend({
        top: topPadding,
        bottom: bottomPadding,
        left: leftPadding,
        right: rightPadding,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .toBuffer();

    // Convert result to base64
    const resultBase64 = paddedBuffer.toString('base64');
    return `data:image/${metadata.format || 'png'};base64,${resultBase64}`;
  }

  /**
   * Parse hex color to RGB object for sharp
   * @param hex - Hex color string (e.g., '#FFFFFF' or '#FFF')
   * @returns RGB color object
   */
  private parseHexColor(hex: string): { r: number; g: number; b: number; alpha: number } {
    // Remove # if present
    const cleanHex = hex.replace(/^#/, '');

    // Handle 3-digit hex
    const fullHex = cleanHex.length === 3
      ? cleanHex.split('').map(char => char + char).join('')
      : cleanHex;

    // Parse RGB values
    const r = parseInt(fullHex.substring(0, 2), 16);
    const g = parseInt(fullHex.substring(2, 4), 16);
    const b = parseInt(fullHex.substring(4, 6), 16);

    return { r, g, b, alpha: 1 };
  }

  /**
   * Resize an image to specified dimensions with quality control
   * Supports multiple fit modes and output formats
   *
   * @param imageBase64 - Base64 encoded image string
   * @param options - Resize options (width, height, quality, format, fit)
   * @returns Resized image with metadata
   */
  async resize(imageBase64: string, options: ResizeOptions): Promise<ResizedImage> {
    // Remove data URI prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Get original image metadata
    const metadata = await sharp(imageBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to read image dimensions');
    }

    // Set default values
    const quality = options.quality ?? 90;
    const format = options.format ?? 'jpeg';
    const fit = options.fit ?? 'contain';

    // Prepare sharp instance with resize options
    let sharpInstance = sharp(imageBuffer).resize(options.width, options.height, {
      fit,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    });

    // Apply format-specific options
    if (format === 'jpeg') {
      sharpInstance = sharpInstance.jpeg({ quality });
    } else if (format === 'png') {
      sharpInstance = sharpInstance.png({ quality });
    } else if (format === 'webp') {
      sharpInstance = sharpInstance.webp({ quality });
    }

    // Process the image
    const resizedBuffer = await sharpInstance.toBuffer();
    const resizedMetadata = await sharp(resizedBuffer).metadata();

    // Return result
    return {
      base64: `data:image/${format};base64,${resizedBuffer.toString('base64')}`,
      width: resizedMetadata.width || options.width,
      height: resizedMetadata.height || options.height,
      format,
      sizeBytes: resizedBuffer.length,
    };
  }

  /**
   * Convenience method to resize image to 720x1280 (Sora 2 compatible dimensions)
   * Uses 'contain' fit mode to preserve aspect ratio with white background
   *
   * @param imageBase64 - Base64 encoded image string
   * @returns Resized image at 720x1280 with high quality JPEG encoding
   */
  async resizeTo720x1280(imageBase64: string): Promise<ResizedImage> {
    return this.resize(imageBase64, {
      width: 720,
      height: 1280,
      quality: 90,
      format: 'jpeg',
      fit: 'contain',
    });
  }
}
