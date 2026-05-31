#!/usr/bin/env node
// Burn elegant Japanese telop onto a (text-free) Veo3 commercial, preserving native audio.
// Usage:
//   node scripts/burn-telop.mjs --in in.mp4 --out out.mp4 --telop telop.json [--font <ttc>] [--style gothic|mincho]
// telop.json: [{ "text": "うるおう、わたしへ。", "start": 0.4, "end": 3.2, "size": 0.058, "y": "h*0.80" }, ...]
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) o[argv[i].slice(2)] = argv[i + 1]?.startsWith("--") ? true : argv[++i];
  }
  return o;
}

const a = parseArgs(process.argv.slice(2));
if (!a.in || !a.out || !a.telop) {
  console.error("usage: --in <mp4> --out <mp4> --telop <json> [--font <ttc>] [--style gothic|mincho]");
  process.exit(1);
}

const FONTS = {
  gothic: ["/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc", "/System/Library/Fonts/ヒラギノ角ゴシック W7.ttc"],
  mincho: ["/System/Library/Fonts/ヒラギノ明朝 ProN.ttc"],
};
const fallbackFonts = [...FONTS.gothic, ...FONTS.mincho, "/System/Library/Fonts/Hiragino Sans GB.ttc"];
const font = a.font || (FONTS[a.style] || []).find(existsSync) || fallbackFonts.find(existsSync);
if (!font || !existsSync(font)) {
  console.error("no Japanese font found; pass --font <path-to-ttc>");
  process.exit(2);
}

if (!existsSync(a.in)) { console.error(`input not found: ${a.in}`); process.exit(2); }
const segments = JSON.parse(readFileSync(a.telop, "utf8"));
if (!Array.isArray(segments) || segments.length === 0) { console.error("telop json must be a non-empty array"); process.exit(2); }

// Probe height to scale font sizes responsively.
const probe = JSON.parse(
  execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=height", "-of", "json", a.in]).toString(),
);
const height = probe.streams?.[0]?.height || 1080;

const tmp = mkdtempSync(join(tmpdir(), "telop-"));
const drawtexts = segments.map((s, i) => {
  const tf = join(tmp, `t${i}.txt`);
  writeFileSync(tf, String(s.text));
  const start = Number(s.start);
  const end = Number(s.end);
  const fd = s.fade != null ? Number(s.fade) : 0.35; // fade in/out seconds
  const fontsize = Math.round(height * (s.size != null ? Number(s.size) : 0.054));
  const y = s.y || "h*0.80-th/2"; // lower third, vertically centered on its band
  // alpha ramps 0 -> 1 (fade in) ... 1 -> 0 (fade out) for an elegant, quick reveal.
  const alpha =
    `if(lt(t,${start}),0,` +
    `if(lt(t,${start + fd}),(t-${start})/${fd},` +
    `if(lt(t,${end - fd}),1,` +
    `if(lt(t,${end}),(${end}-t)/${fd},0))))`;
  return (
    `drawtext=fontfile='${font}':textfile='${tf}':fontcolor=white:fontsize=${fontsize}:` +
    `x=(w-text_w)/2:y=${y}:box=1:boxcolor=black@0.30:boxborderw=28:` +
    `shadowcolor=black@0.55:shadowx=0:shadowy=2:line_spacing=12:` +
    `enable='between(t,${start},${end})':alpha='${alpha}'`
  );
});

const vf = drawtexts.join(",");
console.log(`font: ${font}\nsegments: ${segments.length} | source height: ${height}p`);
execFileSync(
  "ffmpeg",
  ["-y", "-i", a.in, "-vf", vf, "-c:a", "copy", "-c:v", "libx264", "-preset", "slow", "-crf", "20",
   "-pix_fmt", "yuv420p", "-movflags", "+faststart", a.out],
  { stdio: "inherit" },
);
console.log(`\n✅ wrote ${a.out}`);
