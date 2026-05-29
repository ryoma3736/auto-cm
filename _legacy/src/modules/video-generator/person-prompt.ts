/**
 * Person-aware Prompt Generator
 * Generates optimized Sora2 prompts that incorporate person characteristics
 */

import type { PersonProfile } from '../person-analyzer/index.js';
import type { ProductAnalysis } from '../image-analyzer/index.js';
import type { UGCScript } from '../script-generator/index.js';
import type { TalentProfile } from '../talent-profiler/index.js';

/**
 * Person video generation request
 */
export interface PersonVideoRequest {
  /** Person profile from PersonAnalyzer */
  personProfile: PersonProfile;
  /** Product analysis from VisionAnalyzer */
  productAnalysis: ProductAnalysis;
  /** Generated UGC script */
  script: UGCScript;
  /** Video duration in seconds */
  duration: number;
  /** Language code */
  language: 'ja' | 'en' | 'zh';
  /** Optional talent profile from TalentProfiler */
  talentProfile?: TalentProfile;
}

/**
 * Enhanced prompt result
 */
export interface EnhancedPromptResult {
  /** Main prompt for Sora2 */
  prompt: string;
  /** Person description for embedding */
  personDescription: string;
  /** Scene-specific prompts */
  scenePrompts: string[];
  /** Recommended camera movements */
  cameraMovements: string[];
}

/**
 * Generate person-aware Sora2 prompt
 */
export function generatePersonPrompt(request: PersonVideoRequest): EnhancedPromptResult {
  const { personProfile, productAnalysis, script, language, talentProfile } = request;

  // Build person description
  // Use talentProfile if available, otherwise use personProfile
  const personDescription = talentProfile
    ? generateTalentPrompt(talentProfile)
    : buildPersonDescription(personProfile, language);

  // Build scene-specific prompts
  const scenePrompts = script.scenes.map((scene, index) => {
    return buildScenePrompt(scene, personProfile, productAnalysis, index, language);
  });

  // Build camera movements
  const cameraMovements = generateCameraMovements(request.duration);

  // Build main prompt
  const prompt = buildMainPrompt({
    personDescription,
    productAnalysis,
    script,
    cameraMovements,
    language,
  });

  return {
    prompt,
    personDescription,
    scenePrompts,
    cameraMovements,
  };
}

/**
 * Generate talent-specific prompt from TalentProfile
 */
function generateTalentPrompt(talentProfile: TalentProfile): string {
  const { appearance } = talentProfile;
  return `A Japanese woman resembling ${talentProfile.name} with ${appearance.faceType}, ${appearance.hairStyle} hair, ${appearance.bodyType} build, wearing ${appearance.fashionStyle} style clothing. ${talentProfile.videoPromptHints}`;
}

/**
 * Build person description for prompt
 */
function buildPersonDescription(profile: PersonProfile, language: 'ja' | 'en' | 'zh'): string {
  const { estimatedAge, gender, facialFeatures, expression, hairStyle, clothingStyle } = profile;

  const genderText = {
    ja: { male: '男性', female: '女性', other: '人物' },
    en: { male: 'man', female: 'woman', other: 'person' },
    zh: { male: '男性', female: '女性', other: '人' },
  };

  const templates = {
    ja: `${estimatedAge}歳の${genderText.ja[gender]}、${facialFeatures}、${expression}。${hairStyle}、${clothingStyle}。`,
    en: `A ${estimatedAge}-year-old ${genderText.en[gender]} with ${facialFeatures}, ${expression}. ${hairStyle}, ${clothingStyle}.`,
    zh: `${estimatedAge}岁的${genderText.zh[gender]}，${facialFeatures}，${expression}。${hairStyle}，${clothingStyle}。`,
  };

  return templates[language];
}

/**
 * Build scene-specific prompt
 */
function buildScenePrompt(
  scene: { narration: string; durationSeconds: number; visualDescription?: string },
  profile: PersonProfile,
  product: ProductAnalysis,
  sceneIndex: number,
  language: 'ja' | 'en' | 'zh'
): string {
  const actionPrompts = {
    ja: [
      `人物が${product.productName}を手に取り、興味深そうに見つめる`,
      `人物が${product.productName}の特徴を紹介しながら微笑む`,
      `人物が${product.productName}を使用して満足げな表情を見せる`,
    ],
    en: [
      `Person picks up ${product.productName} and examines it with interest`,
      `Person introduces ${product.productName} features while smiling`,
      `Person uses ${product.productName} and shows satisfaction`,
    ],
    zh: [
      `人物拿起${product.productName}，饶有兴趣地观察`,
      `人物微笑着介绍${product.productName}的特点`,
      `人物使用${product.productName}，露出满意的表情`,
    ],
  };

  const prompts = actionPrompts[language];
  return prompts[sceneIndex % prompts.length];
}

/**
 * Generate camera movements based on duration
 */
function generateCameraMovements(duration: number): string[] {
  if (duration <= 4) {
    return ['static medium shot with slight zoom'];
  } else if (duration <= 8) {
    return [
      'start with close-up, pull back to medium shot',
      'gentle pan following product',
    ];
  } else {
    return [
      'open with establishing shot',
      'transition to medium close-up on person',
      'close-up on product details',
      'pull back to show person with product',
    ];
  }
}

/**
 * Build main Sora2 prompt
 */
function buildMainPrompt(params: {
  personDescription: string;
  productAnalysis: ProductAnalysis;
  script: UGCScript;
  cameraMovements: string[];
  language: 'ja' | 'en' | 'zh';
}): string {
  const { personDescription, productAnalysis, cameraMovements } = params;

  // Always use English for Sora2 prompt (best results)
  const productColors = productAnalysis.colors.join(', ');
  const productMood = productAnalysis.mood.join(', ');
  const cameraDesc = cameraMovements.join('. ');

  // Build a cinematic prompt
  const prompt = `Cinematic commercial video. ${personDescription} A professional presenter showcasing ${productAnalysis.productName} (${productAnalysis.productType}). The product features ${productColors} colors with a ${productMood} aesthetic. ${productAnalysis.brandStyle} style. The person holds and presents the product naturally, making eye contact with the camera. Smooth camera movements: ${cameraDesc}. Professional studio lighting with soft shadows. High-end advertisement quality. 4K, shallow depth of field.`;

  return prompt;
}

/**
 * Merge person prompt with existing script prompt
 */
export function mergeWithScriptPrompt(
  personPromptResult: EnhancedPromptResult,
  originalScriptPrompt: string
): string {
  // If no person description, return original
  if (!personPromptResult.personDescription) {
    return originalScriptPrompt;
  }

  // If talent profile was used, prioritize talent characteristics at the beginning
  // Otherwise, enhance the original prompt with person details
  const enhanced = `${personPromptResult.personDescription} ${personPromptResult.prompt} Original concept: ${originalScriptPrompt.substring(0, 200)}`;

  return enhanced.substring(0, 1000); // Sora2 prompt limit
}

/**
 * Create composite image prompt for person + product
 */
export function createCompositePrompt(
  personProfile: PersonProfile,
  productAnalysis: ProductAnalysis
): string {
  const gender = personProfile.gender === 'male' ? 'man' :
                 personProfile.gender === 'female' ? 'woman' : 'person';

  return `A ${personProfile.estimatedAge}-year-old ${gender} holding ${productAnalysis.productName}. ${personProfile.facialFeatures}. ${personProfile.expression}. Professional product photography lighting. Clean background. Commercial advertisement style.`;
}
