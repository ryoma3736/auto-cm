import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeAndScript } from "@/lib/pipeline/analyze";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  imageBase64: z.string().min(16),
  mimeType: z.string().optional(),
  lang: z.enum(["ja", "en", "zh"]).default("ja"),
  duration: z.number().int().min(4).max(15).default(8),
  productHint: z.string().max(200).optional(),
  customPrompt: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "invalid request", detail: String(e) }, { status: 400 });
  }
  try {
    const result = await analyzeAndScript(parsed);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: "analysis failed", detail: String(e) }, { status: 502 });
  }
}
