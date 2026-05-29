import type { EngineId } from "./types";

/** Presentational metadata for each engine — drives the engine-selection UI. */
export interface EngineInfo {
  id: EngineId;
  name: string;
  provider: string;
  description: string;
  bestFor: string[];
  estimatedTime: string;
  costPerGeneration: string;
  quality: 4 | 5;
  features: string[];
  /** Whether this engine needs a presenter/talent image. */
  requiresTalent?: boolean;
}

export const ENGINE_CATALOG: Record<EngineId, EngineInfo> = {
  sora2: {
    id: "sora2",
    name: "Sora 2",
    provider: "OpenAI · via Replicate",
    description: "最高品質。フォトリアルで映像作品レベルの生成。",
    bestFor: ["プロ品質CM", "高級ブランド", "映像作品"],
    estimatedTime: "120–300秒",
    costPerGeneration: "$0.15",
    quality: 5,
    features: ["最高品質", "リアリスティック", "長尺対応"],
  },
  veo3: {
    id: "veo3",
    name: "Veo 3.1",
    provider: "Google DeepMind · Gemini API",
    description: "音声同時生成。ナレーション付きCMをワンショットで。",
    bestFor: ["ナレーション動画", "音声付きCM", "SNS動画"],
    estimatedTime: "90–180秒",
    costPerGeneration: "$0.08",
    quality: 5,
    features: ["ネイティブ音声", "高品質", "長尺対応"],
  },
  kling: {
    id: "kling",
    name: "Kling v2.5 Turbo Pro",
    provider: "Kuaishou · via Replicate",
    description: "モーション特化。商品の動きを自然に表現。",
    bestFor: ["商品紹介", "動作デモ", "UGC風動画"],
    estimatedTime: "45–90秒",
    costPerGeneration: "$0.05",
    quality: 4,
    features: ["Identity保持", "First Frame対応", "9:16対応"],
  },
  seedance: {
    id: "seedance",
    name: "Seedance 1.0 Pro",
    provider: "ByteDance · ModelArk",
    description: "シネマティック品質。映画風の美しい映像をコスパ良く。",
    bestFor: ["ブランド動画", "広告", "アート作品"],
    estimatedTime: "30–60秒",
    costPerGeneration: "$0.03",
    quality: 4,
    features: ["シネマティック", "高速生成", "低コスト"],
  },
  heygen: {
    id: "heygen",
    name: "HeyGen",
    provider: "HeyGen Inc.",
    description: "リップシンク特化。人物が自然に話すトーキングヘッド動画。",
    bestFor: ["プレゼンター動画", "説明動画", "トーキングヘッド"],
    estimatedTime: "60–120秒",
    costPerGeneration: "$0.10",
    quality: 5,
    features: ["リップシンク", "音声クローン", "多言語"],
    requiresTalent: true,
  },
};

export const ALL_ENGINE_IDS = Object.keys(ENGINE_CATALOG) as EngineId[];

/** Heuristic recommendation given the product type and whether a talent image is provided. */
export function getRecommendedEngine(
  productType: string,
  hasTalentImage: boolean,
): EngineId {
  if (hasTalentImage) return "heygen";
  const p = productType.toLowerCase();
  if (p.includes("ブランド") || p.includes("高級") || p.includes("luxury")) return "seedance";
  if (p.includes("ナレーション") || p.includes("音声") || p.includes("voice")) return "veo3";
  if (p.includes("食品") || p.includes("飲料") || p.includes("food")) return "kling";
  return "sora2";
}
