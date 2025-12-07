/**
 * Engine Recommender - Smart recommendation system for video engines
 *
 * Analyzes user input (person image, audio, narration) and recommends
 * the most suitable video generation engine.
 */

import type { PipelineV2Input, VideoEngine } from '../pipeline/v2.js';

export interface EngineRecommendation {
  /** Recommended engine */
  engine: VideoEngine;
  /** Reason for recommendation (Japanese) */
  reason: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** Alternative engines */
  alternatives?: Array<{
    engine: VideoEngine;
    reason: string;
  }>;
}

export interface RecommenderOptions {
  /** User priority */
  priority?: 'quality' | 'cost' | 'speed';
  /** Narration text length threshold */
  longNarrationThreshold?: number;
}

export class EngineRecommender {
  private options: Required<RecommenderOptions>;

  constructor(options: RecommenderOptions = {}) {
    this.options = {
      priority: 'quality',
      longNarrationThreshold: 100,
      ...options,
    };
  }

  /**
   * Recommend the best engine based on input
   */
  recommend(input: PipelineV2Input): EngineRecommendation {
    const hasPerson = !!input.personImageBase64;
    const hasAudio = !!input.audioUrl;
    const narrationLength = input.narrationText?.length || 0;
    const hasLongNarration = narrationLength > this.options.longNarrationThreshold;

    // Priority 1: Person image + Audio → HeyGen (lip-sync)
    if (hasPerson && hasAudio) {
      return {
        engine: 'heygen',
        reason: '人物画像と音声が指定されているため、リップシンク機能に優れたHeyGenをおすすめします',
        confidence: 95,
        alternatives: [
          {
            engine: 'veo3',
            reason: '音声付き生成も可能ですが、リップシンクはHeyGenが最適です',
          },
        ],
      };
    }

    // Priority 2: Long narration → Veo3 (native audio support)
    if (hasLongNarration) {
      return {
        engine: 'veo3',
        reason: 'ナレーションが長いため、音声同時生成に優れたVeo3をおすすめします',
        confidence: 85,
        alternatives: [
          {
            engine: 'heygen',
            reason: 'リップシンクで音声を表現することも可能です',
          },
          {
            engine: 'kling',
            reason: '音声は別途生成が必要ですが、高品質なモーション動画を作成できます',
          },
        ],
      };
    }

    // Priority 3: High quality requirement
    if (this.options.priority === 'quality') {
      return {
        engine: 'seedance',
        reason: '高品質要求のため、シネマティック品質に優れたSeedanceをおすすめします',
        confidence: 80,
        alternatives: [
          {
            engine: 'veo3',
            reason: 'Googleの最新モデルで高品質な動画を生成できます',
          },
          {
            engine: 'kling',
            reason: 'モーション品質も非常に高く、商品動画に最適です',
          },
        ],
      };
    }

    // Priority 4: Cost optimization
    if (this.options.priority === 'cost') {
      return {
        engine: 'seedance',
        reason: 'コスト重視のため、高速で安価なSeedanceをおすすめします',
        confidence: 75,
        alternatives: [
          {
            engine: 'kling',
            reason: 'コストパフォーマンスに優れ、高品質な動画を生成できます',
          },
        ],
      };
    }

    // Priority 5: Product image only → Kling (motion)
    if (!hasPerson) {
      return {
        engine: 'kling',
        reason: '商品画像のみのため、自然なモーション生成に優れたKlingをおすすめします',
        confidence: 90,
        alternatives: [
          {
            engine: 'seedance',
            reason: 'より映画的な表現を求める場合はSeedanceもおすすめです',
          },
          {
            engine: 'veo3',
            reason: '音声付きで商品の動きを表現することもできます',
          },
        ],
      };
    }

    // Default: Kling (balanced)
    return {
      engine: 'kling',
      reason: 'バランスの取れた品質とコストのKlingをおすすめします',
      confidence: 70,
      alternatives: [
        {
          engine: 'heygen',
          reason: '人物を起用したい場合はHeyGenが最適です',
        },
        {
          engine: 'seedance',
          reason: 'より高品質な映像を求める場合はSeedanceもおすすめです',
        },
        {
          engine: 'veo3',
          reason: '音声付き動画を作成したい場合はVeo3が最適です',
        },
      ],
    };
  }

  /**
   * Get detailed explanation for each engine
   */
  getEngineExplanation(engine: VideoEngine): string {
    const explanations: Record<VideoEngine, string> = {
      heygen: '人物が話すリップシンク動画。インフルエンサー風PR、商品レビュー、説明動画向け',
      kling: '商品が動くモーション動画。商品PV、ブランドCM、SNS広告向け',
      seedance: '映画風シネマティック動画。高品質ブランドCM、プレミアム商品紹介、ティザー動画向け',
      veo3: '音声付きシネマティック動画（Google）。会話・効果音付き動画、高品質ナレーション、没入型コンテンツ向け',
      all: '4エンジン同時生成でA/B比較。最適なエンジン選定、マーケティングテスト用',
      both: 'KlingとHeyGenの2エンジン生成。モーションとリップシンクを比較',
    };

    return explanations[engine] || 'エンジンの説明が利用できません';
  }

  /**
   * Get icon for each engine
   */
  getEngineIcon(engine: VideoEngine): string {
    const icons: Record<VideoEngine, string> = {
      heygen: '🎤',
      kling: '🎬',
      seedance: '🎥',
      veo3: '🔊',
      all: '🚀',
      both: '⚡',
    };

    return icons[engine] || '🎬';
  }

  /**
   * Get color for each engine (hex)
   */
  getEngineColor(engine: VideoEngine): string {
    const colors: Record<VideoEngine, string> = {
      heygen: '#667eea',
      kling: '#f5a623',
      seedance: '#38a169',
      veo3: '#4285f4',
      all: '#ff6b6b',
      both: '#9c27b0',
    };

    return colors[engine] || '#666666';
  }
}

/**
 * Factory function for recommender
 */
export function createRecommender(options?: RecommenderOptions): EngineRecommender {
  return new EngineRecommender(options);
}

/**
 * Convenience function to get recommendation
 */
export function recommendEngine(
  input: PipelineV2Input,
  options?: RecommenderOptions
): EngineRecommendation {
  const recommender = createRecommender(options);
  return recommender.recommend(input);
}
