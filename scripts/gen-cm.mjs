#!/usr/bin/env node
// Generate a text-free, actress-led commercial via Veo 3 (native audio). Telop is burned later.
// Usage: node scripts/gen-cm.mjs --out /tmp/veo3-cm.mp4 [--prompt-file p.txt]
import { writeFileSync, readFileSync, existsSync } from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, v, i, arr) => {
    if (v.startsWith("--")) acc.push([v.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);
const OUT = args.out || "/tmp/veo3-cm.mp4";

let KEY = process.env.GEMINI_API_KEY;
if (!KEY && existsSync(".env.local")) KEY = readFileSync(".env.local", "utf8").match(/GEMINI_API_KEY=(.+)/)?.[1].trim();
if (!KEY) { console.error("GEMINI_API_KEY missing"); process.exit(1); }

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.VEO_MODEL || "veo-3.1-fast-generate-preview";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DEFAULT_PROMPT =
  "Photorealistic cinematic 8-second luxury skincare commercial. A beautiful Japanese woman in her late 20s " +
  "with natural, glowing skin stands in a bright, airy modern bathroom with soft morning light. She gently " +
  "picks up an elegant frosted-glass serum dropper bottle, smiles softly, applies a drop of serum to her cheek, " +
  "and looks warmly into the camera. Shallow depth of field, soft warm key light, premium beauty-commercial " +
  "color grade, smooth slow camera push-in. She speaks softly in Japanese: 「うるおうたびに、わたしを好きになる。」 " +
  "Gentle ambient piano. No on-screen text, no captions, no subtitles, no watermark, clean frame, 16:9.";
const prompt = args["prompt-file"] ? readFileSync(args["prompt-file"], "utf8") : DEFAULT_PROMPT;

console.log("submitting Veo3…");
let res = await fetch(`${BASE}/models/${MODEL}:predictLongRunning?key=${KEY}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ instances: [{ prompt }], parameters: { aspectRatio: "16:9" } }),
});
if (!res.ok) { console.error("SUBMIT FAILED", res.status, await res.text()); process.exit(1); }
const op = await res.json();
console.log("operation:", op.name);

let done, last;
for (let i = 0; i < 55; i++) {
  await sleep(8000);
  const r = await fetch(`${BASE}/${op.name}?key=${KEY}`);
  last = await r.json();
  done = last.done;
  process.stdout.write(`  poll ${i + 1}: done=${!!done}\n`);
  if (done) break;
}
if (!done) { console.error("TIMEOUT"); process.exit(2); }
if (last.error) { console.error("OP ERROR", JSON.stringify(last.error)); process.exit(3); }

const r = last.response || {};
const uri =
  r?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
  r?.generatedSamples?.[0]?.video?.uri ||
  r?.generateVideoResponse?.generatedVideos?.[0]?.video?.uri ||
  r?.videos?.[0]?.uri;
console.log("video uri:", uri ? uri.slice(0, 80) + "…" : "(none)");
if (!uri) { console.error("RESPONSE:", JSON.stringify(r).slice(0, 600)); process.exit(4); }

let dl = await fetch(uri.includes("?") ? `${uri}&key=${KEY}` : `${uri}?key=${KEY}`);
if (!dl.ok) dl = await fetch(uri, { headers: { "x-goog-api-key": KEY } });
const buf = Buffer.from(await dl.arrayBuffer());
writeFileSync(OUT, buf);
console.log(`✅ saved ${OUT} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
