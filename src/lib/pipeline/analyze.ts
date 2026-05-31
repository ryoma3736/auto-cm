import { GoogleGenerativeAI } from "@google/generative-ai";
import { env, hasAnalysisProvider } from "@/lib/env";
import type { Lang } from "@/lib/engines/types";

export interface ProductAnalysis {
  productName: string;
  category: string;
  features: string[];
  targetAudience: string;
  mood: string;
  colors: string[];
}

export interface AdScript {
  /** Short attention hook (target language). */
  hook: string;
  /** Spoken narration — guaranteed to be in `lang`. */
  narration: string;
  /** English, scene-merged generation prompt that embeds the narration intent. */
  videoPrompt: string;
  durationSeconds: number;
  lang: Lang;
}

export interface AnalyzeInput {
  imageBase64: string; // raw base64 (no data: prefix) or data URL
  mimeType?: string;
  lang: Lang;
  duration: number;
  productHint?: string;
  customPrompt?: string;
}

export interface AnalyzeResult {
  analysis: ProductAnalysis;
  script: AdScript;
}

const LANG_RULE: Record<Lang, string> = {
  ja: "【絶対厳守】narration と hook は100%日本語で書くこと。英語禁止。友達に話すような自然でカジュアルな話し言葉にする。",
  en: "STRICT: write narration and hook in natural, casual English — like talking to a friend on social media.",
  zh: "严格要求：narration 和 hook 必须用自然口语化的中文书写。",
};

/** Human casting per market — the CM MUST feature a real, expressive person using the product. */
const CAST_RULE: Record<Lang, string> = {
  ja: "起用人物: 20〜30代の日本人女性モデル/女優（自然な美しさ、上品で親しみやすい）。商品を手に取り、実際に使い、表情豊かに魅せる実写であること。商品単体のショットだけで終わらせない。",
  en: "Casting: a real, relatable female presenter (20s–30s) who holds and actually uses the product, expressive and natural. Never a product-only montage.",
  zh: "出镜人物：20–30岁真实自然的女性模特/演员，手持并实际使用产品，表情自然生动。不要只有产品空镜。",
};

function stripBase64(b: string): string {
  return b.replace(/^data:[^;]+;base64,/, "");
}

function parseJson<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned) as T;
}

function buildPrompt(input: AnalyzeInput): string {
  const langRule = LANG_RULE[input.lang];
  const castRule = CAST_RULE[input.lang];
  const custom = input.customPrompt?.trim()
    ? `\nユーザー指定の方向性（最優先で反映）: ${input.customPrompt.trim()}`
    : "";
  const hint = input.productHint?.trim() ? `\n商品ヒント: ${input.productHint.trim()}` : "";
  return `あなたはトップクラスの広告クリエイティブディレクターです。
この商品画像を分析し、${input.duration}秒のCM動画の台本をJSONで出力してください。${hint}${custom}

${langRule}

${castRule}

重要:
- videoPrompt は英語で、全シーンを統合した1本の動画生成プロンプトにすること。
- videoPrompt の主役は上記の起用人物にすること（実写の人物が商品を手に取り使うシーンを中心に、photorealistic / cinematic）。商品単体ショットだけにしない。
- videoPrompt には narration の内容（話す言葉の意図）と「the presenter speaking in ${input.lang}」を必ず含めること（Veo3 の native audio で声が乗る）。
- videoPrompt の末尾に必ず "no on-screen text, no captions, no subtitles, no watermark, clean frame" を含めること（テロップは後処理で焼くため、動画内に文字を一切描かせない）。
- ${input.duration}秒に収まる尺・テンポにすること。

次のJSONスキーマで厳密に返答（説明文・マークダウン不要、JSONのみ）:
{
  "analysis": {
    "productName": "推定商品名/説明",
    "category": "カテゴリ",
    "features": ["特徴1","特徴2"],
    "targetAudience": "ターゲット層",
    "mood": "トーン/ムード",
    "colors": ["主要色1","主要色2"]
  },
  "script": {
    "hook": "冒頭3秒のフック（${input.lang}）",
    "narration": "ナレーション全文（${input.lang}）",
    "videoPrompt": "English scene-merged video generation prompt featuring a real human presenter holding and using the product (photorealistic, cinematic), embedding the narration intent, including 'the presenter speaking in ${input.lang}', and ending with 'no on-screen text, no captions, no subtitles, clean frame'."
  }
}`;
}

/** Templated fallback used in mock mode / when no analysis provider is configured. */
function fallback(input: AnalyzeInput): AnalyzeResult {
  const name = input.productHint?.trim() || "この商品";
  const narration: Record<Lang, string> = {
    ja: `${name}、気になってたんだよね。これ一つで毎日がちょっと特別になる感じ。`,
    en: `I've been eyeing ${name} for a while — it makes every day feel a little special.`,
    zh: `${name}，我关注好久了，有了它每天都变得有点特别。`,
  };
  return {
    analysis: {
      productName: name,
      category: "general",
      features: ["high quality", "premium design"],
      targetAudience: "20-40s",
      mood: "premium, warm",
      colors: ["#1a1a1a", "#e8a33d"],
    },
    script: {
      hook: input.lang === "ja" ? "これ、知ってる人だけ得してる。" : "The ones in the know are winning.",
      narration: narration[input.lang],
      videoPrompt: `Photorealistic cinematic ${input.duration}s commercial: a real ${input.lang === "ja" ? "Japanese " : ""}female model (20s-30s, natural beauty) holds and uses ${name}, expressive close-ups, soft warm key light, shallow depth of field, premium mood. The presenter speaking in ${input.lang}: "${narration[input.lang]}". No on-screen text, no captions, no subtitles, no watermark, clean frame. ${input.customPrompt ?? ""}`.trim(),
      durationSeconds: input.duration,
      lang: input.lang,
    },
  };
}

export async function analyzeAndScript(input: AnalyzeInput): Promise<AnalyzeResult> {
  if (!hasAnalysisProvider() || !env.GEMINI_API_KEY) return fallback(input);

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: env.GEMINI_ANALYSIS_MODEL,
    generationConfig: { responseMimeType: "application/json", temperature: 0.8 },
  });

  const result = await model.generateContent([
    { inlineData: { data: stripBase64(input.imageBase64), mimeType: input.mimeType ?? "image/jpeg" } },
    { text: buildPrompt(input) },
  ]);

  const parsed = parseJson<{
    analysis: ProductAnalysis;
    script: Omit<AdScript, "durationSeconds" | "lang">;
  }>(result.response.text());

  return {
    analysis: parsed.analysis,
    script: { ...parsed.script, durationSeconds: input.duration, lang: input.lang },
  };
}
