# TalentProfiler Module

Generates detailed talent profiles for video persona generation using Gemini API.

## Features

- **Appearance Analysis**: Face type, hair style, body type, fashion style
- **Personality Traits**: Speaking style, tone, catchphrase
- **Sora2 Integration**: English video prompt hints for Sora2 video generation
- **Caching**: Built-in cache to avoid redundant API calls
- **Mock Mode**: Testing without API key
- **Retry Logic**: Automatic retry with exponential backoff

## Installation

```bash
npm install @google/generative-ai dotenv
```

## Usage

### Basic Usage

```typescript
import { createTalentProfiler } from './modules/talent-profiler';

// Create profiler instance
const profiler = createTalentProfiler({
  geminiApiKey: process.env.GEMINI_API_KEY,
});

// Generate profile
const profile = await profiler.generateProfile('新垣結衣', 'ja');

console.log(profile);
// {
//   name: '新垣結衣',
//   appearance: {
//     faceType: '卵型、美人系',
//     hairStyle: 'ロングストレート',
//     bodyType: 'スリム',
//     fashionStyle: 'ナチュラル、カジュアルエレガント'
//   },
//   personality: {
//     speakingStyle: '柔らかく優しい',
//     tone: '温かい、落ち着いた',
//     catchphrase: 'ガッキー'
//   },
//   videoPromptHints: 'A young Japanese woman with an oval-shaped beautiful face...'
// }
```

### Mock Mode (for testing)

```typescript
const profiler = createTalentProfiler({ useMock: true });
const profile = await profiler.generateProfile('新垣結衣');
```

### Cache Management

```typescript
// Get cache statistics
const stats = profiler.getCacheStats();
console.log(stats); // { size: 1, keys: ['新垣結衣:ja'] }

// Clear cache for specific talent
profiler.clearCache('新垣結衣');

// Clear all cache
profiler.clearCache();
```

## API Reference

### TalentProfile Interface

```typescript
interface TalentProfile {
  name: string;
  appearance: {
    faceType: string;      // 顔立ち（例: 丸顔、卵型、美人系）
    hairStyle: string;     // 髪型（例: ロングストレート、ショートボブ）
    bodyType: string;      // 体型（例: スリム、標準）
    fashionStyle: string;  // ファッション（例: カジュアル、エレガント）
  };
  personality: {
    speakingStyle: string; // 話し方（例: 柔らかい、ハキハキ）
    tone: string;          // トーン（例: 優しい、明るい）
    catchphrase?: string;  // キャッチフレーズ
  };
  videoPromptHints: string; // Sora2用プロンプトヒント（英語）
}
```

### TalentProfilerOptions Interface

```typescript
interface TalentProfilerOptions {
  geminiApiKey?: string;    // Gemini API key
  geminiModel?: string;     // Model name (default: 'gemini-2.0-flash-exp')
  maxRetries?: number;      // Max retry attempts (default: 3)
  useMock?: boolean;        // Use mock data (default: false)
}
```

### Methods

#### `generateProfile(talentName: string, language?: string): Promise<TalentProfile>`

Generate talent profile from talent name.

- **talentName**: Name of the talent (e.g., "新垣結衣")
- **language**: Output language (default: "ja")
- **Returns**: Promise resolving to TalentProfile
- **Throws**: Error if generation fails after all retries

#### `clearCache(talentName?: string): void`

Clear cache for a specific talent or all cache.

- **talentName**: Optional talent name to clear specific cache

#### `getCacheStats(): { size: number; keys: string[] }`

Get cache statistics.

- **Returns**: Object with cache size and keys

## Environment Variables

```bash
# .env file
GEMINI_API_KEY=your_gemini_api_key_here
```

## Testing

```bash
# Run test script
npx tsx src/modules/talent-profiler/test-talent-profiler.ts

# Type checking
npm run typecheck
```

## Integration with Sora2

The `videoPromptHints` field provides English prompts optimized for Sora2 video generation:

```typescript
const profile = await profiler.generateProfile('新垣結衣');

// Use videoPromptHints in Sora2 API call
const videoPrompt = `${profile.videoPromptHints}. UGC-style video introducing a product...`;
```

## Error Handling

```typescript
try {
  const profile = await profiler.generateProfile('新垣結衣');
} catch (error) {
  if (error instanceof Error) {
    console.error('Profile generation failed:', error.message);
  }
}
```

## Example Output

```json
{
  "name": "新垣結衣",
  "appearance": {
    "faceType": "卵型、美人系、親しみやすい笑顔",
    "hairStyle": "ロングストレート、ミディアム、ボブなど変化が多い",
    "bodyType": "スリム",
    "fashionStyle": "カジュアル、ナチュラル、シンプル"
  },
  "personality": {
    "speakingStyle": "落ち着いた、柔らかい",
    "tone": "優しい、温かい",
    "catchphrase": "ガッキー"
  },
  "videoPromptHints": "A beautiful Japanese woman with an oval face and a warm smile. Her hairstyle varies, often long and straight or a medium bob. She has a slim figure and prefers a casual and natural fashion style. Realistic rendering, natural lighting."
}
```

## License

MIT
