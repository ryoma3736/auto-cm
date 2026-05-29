/**
 * 動画生成エンジン詳細情報定義
 * Issue #48: エンジン詳細カード表示（特徴・料金・処理時間）
 */

export interface EngineFeature {
  icon: string;
  label: string;
}

export interface EngineInfo {
  name: string;
  provider: string;
  description: string;
  bestFor: string[];
  estimatedTime: string;
  costPerGeneration: string;
  quality: string;
  features: string[];
  color: string;
  icon: string;
}

export const ENGINE_INFO: Record<string, EngineInfo> = {
  kling: {
    name: 'Kling v2.5 Turbo Pro',
    provider: 'Kuaishou (via Replicate)',
    description: 'モーション特化、商品の動きを自然に生成',
    bestFor: ['商品紹介', '動作デモ', 'UGC風動画'],
    estimatedTime: '45-90秒',
    costPerGeneration: '$0.05',
    quality: '★★★★☆',
    features: ['Identity Preservation', 'First Frame Support', '9:16対応'],
    color: '#f5a623',
    icon: '🎬',
  },
  heygen: {
    name: 'HeyGen',
    provider: 'HeyGen Inc.',
    description: 'リップシンク特化、人物が話す動画に最適',
    bestFor: ['プレゼンター動画', '説明動画', 'トーキングヘッド'],
    estimatedTime: '60-120秒',
    costPerGeneration: '$0.10',
    quality: '★★★★★',
    features: ['Lip-Sync', 'Voice Cloning', '多言語対応'],
    color: '#667eea',
    icon: '🎤',
  },
  seedance: {
    name: 'Seedance 1.0',
    provider: 'ByteDance (ModelArk)',
    description: 'シネマティック品質、映画風の美しい映像',
    bestFor: ['ブランド動画', '広告', 'アート作品'],
    estimatedTime: '30-60秒',
    costPerGeneration: '$0.03',
    quality: '★★★★☆',
    features: ['Cinematic', 'Fast Generation', 'Cost Effective'],
    color: '#38a169',
    icon: '🎥',
  },
  veo3: {
    name: 'Veo 3.1',
    provider: 'Google DeepMind',
    description: '音声同時生成、ナレーション付き動画',
    bestFor: ['ナレーション動画', '音声付きCM', 'SNS動画'],
    estimatedTime: '90-180秒',
    costPerGeneration: '$0.08',
    quality: '★★★★★',
    features: ['Native Audio', 'High Quality', 'Long Duration'],
    color: '#4285f4',
    icon: '🔊',
  },
  sora2: {
    name: 'Sora 2',
    provider: 'OpenAI (via Replicate)',
    description: '最高品質、リアリスティックな動画生成',
    bestFor: ['プロ品質CM', '高級ブランド', '映像作品'],
    estimatedTime: '120-300秒',
    costPerGeneration: '$0.15',
    quality: '★★★★★',
    features: ['Best Quality', 'Realistic', 'Long Videos'],
    color: '#10a37f',
    icon: '✨',
  },
};

/**
 * エンジン推奨度判定
 * @param productType - 商品タイプ
 * @param hasPersonImage - 人物画像の有無
 * @returns 推奨エンジンキー
 */
export function getRecommendedEngine(
  productType: string,
  hasPersonImage: boolean
): string {
  // 人物起用モードの場合はHeyGen推奨
  if (hasPersonImage) {
    return 'heygen';
  }

  // 商品タイプに応じた推奨エンジン
  const productLower = productType.toLowerCase();

  if (productLower.includes('ブランド') || productLower.includes('高級')) {
    return 'seedance';
  }

  if (productLower.includes('食品') || productLower.includes('飲料')) {
    return 'kling';
  }

  if (productLower.includes('音声') || productLower.includes('ナレーション')) {
    return 'veo3';
  }

  // デフォルトはKling（バランス型）
  return 'kling';
}
