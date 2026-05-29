/**
 * VisionAnalyzer Usage Examples
 * Demonstrates how to use the VisionAnalyzer module for cosmetic product image analysis
 */

import { createVisionAnalyzer, createImageInputModule } from './index.js';

/**
 * Example 1: Basic image analysis using OpenAI Vision API
 */
async function basicAnalysisExample() {
  // Create analyzer instance
  const analyzer = createVisionAnalyzer({
    openaiApiKey: process.env.OPENAI_API_KEY,
  });

  // Load image and convert to Base64
  const imageInput = createImageInputModule();
  const image = await imageInput.loadFromPath('./samples/lipstick.jpg');
  const base64Image = imageInput.toBase64(image);

  // Analyze image
  const analysis = await analyzer.analyze(base64Image);

  console.log('Product Analysis:');
  console.log(`  Type: ${analysis.productType}`);
  console.log(`  Name: ${analysis.productName}`);
  console.log(`  Colors: ${analysis.colors.join(', ')}`);
  console.log(`  Features: ${analysis.features.join(', ')}`);
  console.log(`  Target: ${analysis.targetAudience}`);
  console.log(`  Mood: ${analysis.mood.join(', ')}`);
  console.log(`  Brand: ${analysis.brandStyle}`);
}

/**
 * Example 2: Analysis with Claude as primary provider
 */
async function claudePrimaryExample() {
  const analyzer = createVisionAnalyzer({
    claudeApiKey: process.env.ANTHROPIC_API_KEY,
    useClaudePrimary: true,
  });

  const imageInput = createImageInputModule();
  const image = await imageInput.loadFromUrl('https://example.com/product.jpg');
  const base64Image = imageInput.toBase64(image);

  const analysis = await analyzer.analyze(base64Image);
  console.log('Analysis Result:', analysis);
}

/**
 * Example 3: Analysis with fallback and custom retry settings
 */
async function fallbackExample() {
  const analyzer = createVisionAnalyzer({
    openaiApiKey: process.env.OPENAI_API_KEY,
    claudeApiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 5,
  });

  const imageInput = createImageInputModule({
    maxSizeBytes: 5 * 1024 * 1024, // 5MB limit
    minWidth: 200,
    minHeight: 200,
  });

  try {
    const image = await imageInput.loadAndValidate('./samples/foundation.png');
    const base64Image = imageInput.toBase64(image);
    const analysis = await analyzer.analyze(base64Image);

    // Use analysis for marketing content generation
    console.log(`Generating content for: ${analysis.productName}`);
    console.log(`Colors: ${analysis.colors.join(', ')}`);
    console.log(`Mood: ${analysis.mood.join(', ')}`);
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

/**
 * Example 4: Batch analysis of multiple products
 */
async function batchAnalysisExample() {
  const analyzer = createVisionAnalyzer();
  const imageInput = createImageInputModule();

  const imagePaths = [
    './samples/lipstick-1.jpg',
    './samples/lipstick-2.jpg',
    './samples/foundation.jpg',
    './samples/perfume.jpg',
  ];

  const results = await Promise.all(
    imagePaths.map(async (path) => {
      try {
        const image = await imageInput.loadAndValidate(path);
        const base64Image = imageInput.toBase64(image);
        return await analyzer.analyze(base64Image);
      } catch (error) {
        console.error(`Failed to analyze ${path}:`, error);
        return null;
      }
    })
  );

  const validResults = results.filter((r) => r !== null);
  console.log(`Successfully analyzed ${validResults.length}/${imagePaths.length} images`);

  // Group by product type
  const byType = validResults.reduce((acc, result) => {
    if (!result) return acc;
    if (!acc[result.productType]) {
      acc[result.productType] = [];
    }
    acc[result.productType].push(result);
    return acc;
  }, {} as Record<string, typeof validResults>);

  console.log('Products by type:', Object.keys(byType));
}

/**
 * Example 5: Integration with marketing content pipeline
 */
async function marketingPipelineExample() {
  const analyzer = createVisionAnalyzer({
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: 'gpt-4o', // Use latest model
  });

  const imageInput = createImageInputModule();
  const image = await imageInput.loadFromPath('./samples/skincare.jpg');
  const base64Image = imageInput.toBase64(image);

  const analysis = await analyzer.analyze(base64Image);

  // Generate marketing copy based on analysis
  const marketingCopy = {
    headline: generateHeadline(analysis),
    description: generateDescription(analysis),
    hashtags: generateHashtags(analysis),
    targetAudience: analysis.targetAudience,
  };

  console.log('Generated Marketing Content:');
  console.log(JSON.stringify(marketingCopy, null, 2));
}

/**
 * Helper: Generate headline from analysis
 */
function generateHeadline(analysis: any): string {
  const moodStr = analysis.mood.slice(0, 2).join('で');
  return `${moodStr}${analysis.productName}`;
}

/**
 * Helper: Generate description from analysis
 */
function generateDescription(analysis: any): string {
  return `${analysis.features.join('、')}が特徴の${analysis.productName}。${analysis.targetAudience}に向けた${analysis.brandStyle}の一品です。`;
}

/**
 * Helper: Generate hashtags from analysis
 */
function generateHashtags(analysis: any): string[] {
  return [
    ...analysis.mood.map((m: string) => `#${m}`),
    ...analysis.colors.map((c: string) => `#${c}`),
    `#${analysis.productType}`,
  ];
}

// Export examples for documentation
export {
  basicAnalysisExample,
  claudePrimaryExample,
  fallbackExample,
  batchAnalysisExample,
  marketingPipelineExample,
};

// Run example if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running VisionAnalyzer examples...\n');

  basicAnalysisExample()
    .then(() => console.log('\n✓ Basic analysis complete'))
    .catch((err) => console.error('✗ Basic analysis failed:', err));
}
