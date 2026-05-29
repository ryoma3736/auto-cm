/**
 * Image Composite Module
 * Combines person and product images for CM generation
 */

import sharp from 'sharp';

export interface CompositeOptions {
  /** Layout style */
  layout: 'side-by-side' | 'person-holding' | 'overlay';
  /** Output width */
  width?: number;
  /** Output height */
  height?: number;
  /** Background color */
  backgroundColor?: string;
  /** Product position (for overlay) */
  productPosition?: 'bottom-right' | 'bottom-left' | 'center';
  /** Product scale (0.1 - 1.0) */
  productScale?: number;
}

export interface CompositeResult {
  /** Base64 encoded composite image */
  base64: string;
  /** Width of output */
  width: number;
  /** Height of output */
  height: number;
  /** Format */
  format: string;
}

/**
 * Composite person and product images
 */
export async function compositeImages(
  personImageBase64: string,
  productImageBase64: string,
  options: CompositeOptions = { layout: 'side-by-side' }
): Promise<CompositeResult> {
  const {
    layout = 'side-by-side',
    width = 720,
    height = 1280,
    backgroundColor = '#FFFFFF',
    productPosition = 'bottom-right',
    productScale = 0.35,
  } = options;

  // Remove data URI prefix if present
  const personData = personImageBase64.replace(/^data:image\/\w+;base64,/, '');
  const productData = productImageBase64.replace(/^data:image\/\w+;base64,/, '');

  const personBuffer = Buffer.from(personData, 'base64');
  const productBuffer = Buffer.from(productData, 'base64');

  let result: Buffer;

  switch (layout) {
    case 'person-holding':
      result = await createPersonHoldingLayout(
        personBuffer,
        productBuffer,
        width,
        height,
        backgroundColor,
        productPosition,
        productScale
      );
      break;
    case 'overlay':
      result = await createOverlayLayout(
        personBuffer,
        productBuffer,
        width,
        height,
        productPosition,
        productScale
      );
      break;
    case 'side-by-side':
    default:
      result = await createSideBySideLayout(
        personBuffer,
        productBuffer,
        width,
        height,
        backgroundColor
      );
      break;
  }

  const base64 = result.toString('base64');

  return {
    base64,
    width,
    height,
    format: 'jpeg',
  };
}

/**
 * Side-by-side layout: Person on left, product on right
 */
async function createSideBySideLayout(
  personBuffer: Buffer,
  productBuffer: Buffer,
  width: number,
  height: number,
  backgroundColor: string
): Promise<Buffer> {
  const halfWidth = Math.floor(width / 2);

  // Resize person to fit left half
  const personResized = await sharp(personBuffer)
    .resize(halfWidth, height, { fit: 'cover', position: 'top' })
    .toBuffer();

  // Resize product to fit right half (with padding)
  const productResized = await sharp(productBuffer)
    .resize(halfWidth - 40, height - 80, { fit: 'contain', background: backgroundColor })
    .toBuffer();

  // Create canvas
  const canvas = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: backgroundColor,
    },
  });

  // Composite both images
  return canvas
    .composite([
      { input: personResized, left: 0, top: 0 },
      { input: productResized, left: halfWidth + 20, top: 40 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
}

/**
 * Person-holding layout: Person as background, product overlaid near hands
 */
async function createPersonHoldingLayout(
  personBuffer: Buffer,
  productBuffer: Buffer,
  width: number,
  height: number,
  backgroundColor: string,
  productPosition: string,
  productScale: number
): Promise<Buffer> {
  // Resize person to fill canvas
  const personResized = await sharp(personBuffer)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .toBuffer();

  // Calculate product size
  const productWidth = Math.floor(width * productScale);
  const productHeight = Math.floor(height * productScale);

  // Resize product with transparency preservation
  const productResized = await sharp(productBuffer)
    .resize(productWidth, productHeight, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();

  // Calculate position
  let left: number, top: number;
  switch (productPosition) {
    case 'bottom-left':
      left = 20;
      top = height - productHeight - 100;
      break;
    case 'center':
      left = Math.floor((width - productWidth) / 2);
      top = Math.floor((height - productHeight) / 2);
      break;
    case 'bottom-right':
    default:
      left = width - productWidth - 20;
      top = height - productHeight - 100;
      break;
  }

  // Composite
  return sharp(personResized)
    .composite([{ input: productResized, left, top }])
    .jpeg({ quality: 90 })
    .toBuffer();
}

/**
 * Overlay layout: Product overlaid on person image
 */
async function createOverlayLayout(
  personBuffer: Buffer,
  productBuffer: Buffer,
  width: number,
  height: number,
  productPosition: string,
  productScale: number
): Promise<Buffer> {
  // Same as person-holding but product is more prominent
  return createPersonHoldingLayout(
    personBuffer,
    productBuffer,
    width,
    height,
    '#FFFFFF',
    productPosition,
    productScale * 1.2 // Larger product
  );
}

/**
 * Create a presenter-style composite
 * Person on one side, product prominently displayed
 */
export async function createPresenterComposite(
  personImageBase64: string,
  productImageBase64: string,
  options: {
    width?: number;
    height?: number;
    personSide?: 'left' | 'right';
    productEmphasis?: 'high' | 'medium' | 'low';
  } = {}
): Promise<CompositeResult> {
  const {
    width = 720,
    height = 1280,
    personSide = 'left',
    productEmphasis = 'medium',
  } = options;

  const personData = personImageBase64.replace(/^data:image\/\w+;base64,/, '');
  const productData = productImageBase64.replace(/^data:image\/\w+;base64,/, '');

  const personBuffer = Buffer.from(personData, 'base64');
  const productBuffer = Buffer.from(productData, 'base64');

  // Calculate dimensions based on emphasis
  const personWidthRatio = productEmphasis === 'high' ? 0.5 : productEmphasis === 'low' ? 0.7 : 0.6;
  const personWidth = Math.floor(width * personWidthRatio);
  const productWidth = width - personWidth;

  // Resize person
  const personResized = await sharp(personBuffer)
    .resize(personWidth, height, { fit: 'cover', position: 'top' })
    .toBuffer();

  // Resize product with padding
  const productPadding = 30;
  const productResized = await sharp(productBuffer)
    .resize(productWidth - productPadding * 2, height - 200, {
      fit: 'contain',
      background: '#FFFFFF'
    })
    .toBuffer();

  // Create canvas
  const canvas = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#FFFFFF',
    },
  });

  // Position based on personSide
  const personLeft = personSide === 'left' ? 0 : productWidth;
  const productLeft = personSide === 'left' ? personWidth + productPadding : productPadding;

  const result = await canvas
    .composite([
      { input: personResized, left: personLeft, top: 0 },
      { input: productResized, left: productLeft, top: 100 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  return {
    base64: result.toString('base64'),
    width,
    height,
    format: 'jpeg',
  };
}
