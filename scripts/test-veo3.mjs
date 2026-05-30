import { writeFileSync, readFileSync, existsSync } from "node:fs";

let KEY = process.env.GEMINI_API_KEY;
if (!KEY && existsSync(".env.local")) KEY = readFileSync(".env.local", "utf8").match(/GEMINI_API_KEY=(.+)/)?.[1].trim();
const BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "veo-3.0-fast-generate-001";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const prompt =
  "A cinematic 8-second commercial: a glowing premium cosmetic serum bottle on a marble surface, " +
  "slow dolly-in, warm golden light, water droplets, a calm female voice speaking in Japanese: " +
  "「うるおう、わたしへ。AURUM ÉCLAT。」";

console.log("submitting Veo3…");
let res = await fetch(`${BASE}/models/${MODEL}:predictLongRunning?key=${KEY}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ instances: [{ prompt }], parameters: { aspectRatio: "16:9" } }),
});
if (!res.ok) {
  console.error("SUBMIT FAILED", res.status, await res.text());
  process.exit(1);
}
const op = await res.json();
console.log("operation:", op.name);

let done, last;
for (let i = 0; i < 40; i++) {
  await sleep(10000);
  const r = await fetch(`${BASE}/${op.name}?key=${KEY}`);
  last = await r.json();
  done = last.done;
  process.stdout.write(`  poll ${i + 1}: done=${!!done}\n`);
  if (done) break;
}
if (!done) { console.error("TIMEOUT"); process.exit(2); }
if (last.error) { console.error("OP ERROR", JSON.stringify(last.error)); process.exit(3); }

console.log("response keys:", JSON.stringify(Object.keys(last.response || {})));
console.log("RESPONSE (trimmed):", JSON.stringify(last.response).slice(0, 600));

// try to locate the video uri across plausible paths
const r = last.response || {};
const uri =
  r?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
  r?.generatedSamples?.[0]?.video?.uri ||
  r?.generateVideoResponse?.generatedVideos?.[0]?.video?.uri ||
  r?.videos?.[0]?.uri;
console.log("video uri:", uri);
if (!uri) process.exit(4);

// download (try ?key= then header)
let dl = await fetch(uri.includes("?") ? `${uri}&key=${KEY}` : `${uri}?key=${KEY}`);
if (!dl.ok) dl = await fetch(uri, { headers: { "x-goog-api-key": KEY } });
console.log("download status:", dl.status, dl.headers.get("content-type"));
const buf = Buffer.from(await dl.arrayBuffer());
writeFileSync("/tmp/veo3-smoke.mp4", buf);
console.log("saved /tmp/veo3-smoke.mp4", buf.length, "bytes");
