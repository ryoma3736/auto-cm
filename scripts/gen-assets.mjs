/**
 * Generate AutoCM brand assets with Gemini image models.
 * Usage: node scripts/gen-assets.mjs            (reads GEMINI_API_KEY from env/.env.local)
 * Idempotent: re-running overwrites the PNG/JPG files under public/3d and public/thumbs.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";

// --- load key from env or .env.local ---
let KEY = process.env.GEMINI_API_KEY;
if (!KEY && existsSync(".env.local")) {
  const m = readFileSync(".env.local", "utf8").match(/GEMINI_API_KEY=(.+)/);
  if (m) KEY = m[1].trim();
}
if (!KEY) {
  console.error("GEMINI_API_KEY not set");
  process.exit(1);
}

const MODELS = ["gemini-3-pro-image", "gemini-2.5-flash-image"];
const STYLE =
  "Cute glossy 3D character mascot, Pixar/Fluent style, soft studio lighting, smooth rounded forms, " +
  "vibrant saturated colors, friendly big eyes, subtle rim light, high detail, centered, full body. " +
  "Isolated on a plain SOLID PURE WHITE background (#ffffff), absolutely NO checkerboard pattern, " +
  "no scenery, just the character with a soft contact shadow.";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PHOTO =
  "Photorealistic premium advertising still, cinematic commercial lighting, shallow depth of field, " +
  "vertical composition, high-end product/CM aesthetic, vivid but tasteful color grading.";

const ASSETS = [
  // mascots (transparent PNG)
  { file: "public/3d/mascot-robot.png", prompt: `${STYLE} A friendly sky-blue robot character holding a small film camera, antenna, rounded body. Brand colors blue and purple.` },
  { file: "public/3d/mascot-ai.png", prompt: `${STYLE} A cheerful magenta-pink AI assistant character holding a clipboard/script, thinking pose, lightbulb idea. Pink and purple palette.` },
  { file: "public/3d/mascot-wizard.png", prompt: `${STYLE} A playful emerald-green wizard character with a pointed hat and a magic wand emitting golden sparkles. Green and teal palette.` },
  { file: "public/3d/mascot-director.png", prompt: `${STYLE} A cute purple rabbit film director character wearing a beret, holding a clapperboard. Purple and violet palette.` },
  { file: "public/3d/mascot-party.png", prompt: `${STYLE} A celebrating mascot character cheering with confetti and a party popper, joyful expression. Blue-purple-pink palette.` },
  { file: "public/3d/mascot-robot-wave.png", prompt: `${STYLE} A small adorable blue-purple robot character waving hello, holding a tiny clapperboard, headphones on. Friendly.` },
  // hero background (wide-ish; used via object-cover)
  { file: "public/3d/hero-bg.png", prompt: "A bright cheerful 3D illustrated film-studio sky scene: blue sky with fluffy white clouds, a studio spotlight, a film camera on a tripod, a director's chair, a rainbow and a red balloon on the right, soft pastel lighting, wide cinematic banner composition, vibrant Pixar style, no text." },
  // CM-style photographic thumbnails (portrait, jpg)
  { file: "public/thumbs/gen-1.jpg", prompt: `${PHOTO} A glowing cosmetic serum bottle on a marble surface with water droplets, beauty commercial.`, jpg: true },
  { file: "public/thumbs/gen-2.jpg", prompt: `${PHOTO} A steaming cup of specialty coffee on a cafe table, warm morning light, cafe commercial.`, jpg: true },
  { file: "public/thumbs/gen-3.jpg", prompt: `${PHOTO} A stylish young woman in fashionable streetwear, urban fashion brand commercial.`, jpg: true },
  { file: "public/thumbs/gen-4.jpg", prompt: `${PHOTO} A friendly female presenter smiling to camera holding a product, talking-head commercial.`, jpg: true },
  { file: "public/thumbs/gen-5.jpg", prompt: `${PHOTO} A sleek modern gadget product floating on a gradient studio backdrop, tech product commercial.`, jpg: true },
  // project thumbnails (square-ish, jpg)
  { file: "public/thumbs/proj-1.jpg", prompt: `${PHOTO} Luxury beauty serum bottle, soft pink tones.`, jpg: true },
  { file: "public/thumbs/proj-2.jpg", prompt: `${PHOTO} Cozy coffee shop interior with a latte, warm tones.`, jpg: true },
  { file: "public/thumbs/proj-3.jpg", prompt: `${PHOTO} Exciting new product launch hero shot, dynamic lighting.`, jpg: true },
  { file: "public/thumbs/proj-4.jpg", prompt: `${PHOTO} E-commerce shopping flat lay with shopping bag and products.`, jpg: true },
];

mkdirSync("public/3d", { recursive: true });
mkdirSync("public/thumbs", { recursive: true });

async function genOne(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });
  if (!res.ok) throw new Error(`${model} ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img) throw new Error(`${model}: no image in response`);
  return Buffer.from(img.inlineData.data, "base64");
}

async function gen(asset) {
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const buf = await genOne(model, asset.prompt);
        writeFileSync(asset.file, buf);
        console.log(`  ✓ ${asset.file}  (${model}, ${buf.length} b)`);
        return true;
      } catch (e) {
        console.log(`  … ${asset.file} ${model} try${attempt} failed: ${String(e).slice(0, 120)}`);
      }
    }
  }
  console.log(`  ✗ ${asset.file} FAILED (all models)`);
  return false;
}

// allow targeting a subset: node gen-assets.mjs mascot  (substring filter)
const filter = process.argv[2];
const todo = filter ? ASSETS.filter((a) => a.file.includes(filter)) : ASSETS;

let ok = 0;
for (const a of todo) {
  // eslint-disable-next-line no-await-in-loop
  if (await gen(a)) ok++;
  // eslint-disable-next-line no-await-in-loop
  await sleep(2500); // throttle to avoid burst "fetch failed"
}
console.log(`\nDONE ${ok}/${todo.length}`);
process.exit(ok === todo.length ? 0 : 2);
