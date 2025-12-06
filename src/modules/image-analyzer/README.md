# Image Analyzer Module

AI-powered cosmetic product image analysis using OpenAI Vision API and Claude Vision API.

## Overview

This module provides comprehensive image analysis capabilities specifically designed for cosmetic products. It extracts structured information about product types, colors, features, target audience, and brand positioning.

## Features

- **Dual API Support**: OpenAI GPT-4 Vision and Claude Vision API
- **Automatic Fallback**: Seamless failover between providers
- **Retry Logic**: Exponential backoff with configurable retries
- **Structured Output**: Type-safe JSON responses
- **Cosmetic-Specific**: Optimized prompts for makeup and skincare products
- **Image Processing**: Built-in image loading, validation, and Base64 conversion

## Installation

```bash
npm install openai @anthropic-ai/sdk axios sharp
```

## Environment Variables

```bash
# Required: At least one API key
OPENAI_API_KEY=sk-proj-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

## Quick Start

### Basic Usage

```typescript
import { createVisionAnalyzer, createImageInputModule } from './modules/image-analyzer';

// Create analyzer
const analyzer = createVisionAnalyzer({
  openaiApiKey: process.env.OPENAI_API_KEY,
});

// Load and analyze image
const imageInput = createImageInputModule();
const image = await imageInput.loadFromPath('./product.jpg');
const base64Image = imageInput.toBase64(image);

const analysis = await analyzer.analyze(base64Image);

console.log(analysis);
// {
//   productType: 'lipstick',
//   productName: 'Luxury Matte Lipstick - Coral Pink',
//   colors: ['coral pink', 'nude undertone'],
//   features: ['long-lasting formula', 'moisturizing', 'matte finish'],
//   targetAudience: '20-30代の働く女性',
//   mood: ['elegant', 'modern', 'sophisticated'],
//   brandStyle: 'high-end luxury brand with minimalist aesthetic',
//   rawDescription: '...'
// }
```

### Using Claude as Primary Provider

```typescript
const analyzer = createVisionAnalyzer({
  claudeApiKey: process.env.ANTHROPIC_API_KEY,
  useClaudePrimary: true,
});
```

### With Fallback and Custom Settings

```typescript
const analyzer = createVisionAnalyzer({
  openaiApiKey: process.env.OPENAI_API_KEY,
  claudeApiKey: process.env.ANTHROPIC_API_KEY,
  openaiModel: 'gpt-4o',
  claudeModel: 'claude-3-5-sonnet-20241022',
  maxRetries: 5,
  useClaudePrimary: false, // Try OpenAI first, fallback to Claude
});
```

## API Reference

### VisionAnalyzer

#### Constructor Options

```typescript
interface VisionAnalyzerOptions {
  openaiApiKey?: string;
  claudeApiKey?: string;
  openaiModel?: string; // default: 'gpt-4o'
  claudeModel?: string; // default: 'claude-3-5-sonnet-20241022'
  maxRetries?: number; // default: 3
  useClaudePrimary?: boolean; // default: false
}
```

#### Methods

##### `analyze(imageBase64: string): Promise<ProductAnalysis>`

Analyzes a cosmetic product image and returns structured data.

**Parameters:**
- `imageBase64` (string): Base64-encoded image (without data URI prefix)

**Returns:** `ProductAnalysis`

```typescript
interface ProductAnalysis {
  productType: 'lipstick' | 'foundation' | 'perfume' | 'skincare' | 'other';
  productName: string;
  colors: string[];
  features: string[];
  targetAudience: string;
  mood: string[];
  brandStyle: string;
  rawDescription: string;
}
```

**Throws:** Error if analysis fails after all retries

### ImageInputModule

#### Constructor Options

```typescript
interface ImageInputOptions {
  maxSizeBytes?: number; // default: 10MB
  minWidth?: number; // default: 100
  minHeight?: number; // default: 100
  maxWidth?: number; // default: 4096
  maxHeight?: number; // default: 4096
}
```

#### Methods

##### `loadFromPath(filePath: string): Promise<ImageData>`

Load image from local file path.

##### `loadFromUrl(url: string): Promise<ImageData>`

Load image from HTTP(S) URL.

##### `toBase64(image: ImageData): string`

Convert ImageData to Base64 string.

##### `validate(image: ImageData): ValidationResult`

Validate image against configured constraints.

##### `loadAndValidate(pathOrUrl: string): Promise<ImageData>`

Load and validate image in one operation.

## Architecture

### Fallback Strategy

```
Primary Provider (OpenAI or Claude)
  ↓ (on error)
Fallback Provider (Claude or OpenAI)
  ↓ (on error)
Retry with exponential backoff
  ↓ (after maxRetries)
Throw error
```

### Retry Logic

- Exponential backoff: 1s, 2s, 4s, 8s, ...
- Configurable max retries (default: 3)
- Immediate failover to fallback provider

### Analysis Prompt

The module uses a specialized system prompt optimized for cosmetic product analysis:

```
あなたは化粧品マーケティングの専門家です。
この商品画像を分析し、以下の情報をJSON形式で抽出してください：

1. productType: 商品カテゴリ
2. productName: 推測される商品名または詳細な説明
3. colors: 色味の配列
4. features: 商品の特徴・セールスポイントの配列
5. targetAudience: ターゲット層の説明
6. mood: 雰囲気・イメージの配列
7. brandStyle: ブランドイメージの説明
8. rawDescription: 画像の詳細な説明文
```

## Testing

The module includes comprehensive unit tests covering:

- OpenAI Vision API integration
- Claude Vision API fallback
- Error handling and retry logic
- Response parsing and validation
- Product type normalization
- Mock-based testing with Vitest

```bash
# Run tests
npm test tests/vision-analyzer.test.ts

# Run with coverage
npm run test:coverage
```

## Examples

See `vision-analyzer.example.ts` for detailed usage examples:

1. Basic image analysis
2. Claude as primary provider
3. Fallback with custom retry settings
4. Batch analysis of multiple products
5. Integration with marketing content pipeline

## Error Handling

```typescript
try {
  const analysis = await analyzer.analyze(base64Image);
  console.log(analysis);
} catch (error) {
  if (error instanceof Error) {
    console.error('Analysis failed:', error.message);
  }
}
```

Common errors:

- `VisionAnalyzer requires at least one API key`: No API keys configured
- `Vision analysis failed after N attempts`: All retries exhausted
- `No response content from OpenAI Vision API`: Empty API response
- `Failed to parse vision analysis response`: Invalid JSON

## Performance

- **Average response time**: 2-5 seconds (depending on API provider)
- **Retry overhead**: Exponential backoff adds 1-15 seconds
- **Fallback latency**: ~2 seconds to switch providers
- **Image size limit**: 10MB (configurable)

## Best Practices

1. **Use environment variables** for API keys
2. **Enable fallback** for production reliability
3. **Validate images** before analysis to avoid wasted API calls
4. **Batch processing** for multiple images (use Promise.all with rate limiting)
5. **Cache results** to avoid redundant API calls
6. **Monitor retries** to detect API issues early

## License

MIT

## Contributing

See the main project README for contribution guidelines.
