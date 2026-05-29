"use client";

import { ArrowRight, Rocket, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Mascot } from "./mascot";
import { EnginePills } from "./engine-pills";

const STEPS = [
  { n: 1, title: "商品を入力", sub: "URL・画像をアップロード", emoji: "📦", hue: 255, ring: "from-blue-400 to-blue-600" },
  { n: 2, title: "AIが企画", sub: "台本・構成を自動生成", emoji: "🎬", hue: 320, ring: "from-fuchsia-400 to-purple-600" },
  { n: 3, title: "CMを生成", sub: "5エンジンで同時生成", emoji: "✨", hue: 150, ring: "from-emerald-400 to-teal-600" },
];

export function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="bg-gradient-hero relative overflow-hidden rounded-3xl px-4 py-7 sm:px-8 sm:py-9">
      {/* ===== Decorative film-set scene (CSS/emoji approximation) ===== */}
      <div className="pointer-events-none absolute inset-0 select-none">
        {/* clouds */}
        <div className="absolute left-[6%] top-8 h-10 w-28 rounded-full bg-white/70 blur-md" />
        <div className="absolute left-[26%] top-4 h-8 w-20 rounded-full bg-white/60 blur-md" />
        <div className="absolute right-[30%] top-10 h-9 w-24 rounded-full bg-white/55 blur-md" />
        {/* studio light + camera + chair (left) */}
        <span className="absolute left-3 top-6 text-4xl drop-shadow sm:text-5xl">🎥</span>
        <span className="absolute bottom-6 left-5 text-3xl drop-shadow sm:text-4xl">🎬</span>
        {/* rainbow + balloon (right) */}
        <span className="absolute right-6 top-4 text-4xl drop-shadow sm:text-5xl">🌈</span>
        <span className="absolute right-[16%] top-9 text-2xl drop-shadow sm:text-3xl">🎈</span>
        {/* sparkles */}
        <Sparkles className="absolute left-[14%] top-16 size-5 text-white/80" />
        <Sparkles className="absolute right-[34%] top-6 size-4 text-amber-200/90" />
      </div>

      {/* "完成！" badge + director screen (right, xl only) */}
      <div className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-2 xl:flex">
        <span className="rounded-xl bg-slate-900/85 px-4 py-1.5 font-heading text-lg font-extrabold text-white shadow-lg">
          完成！
        </span>
        <div className="rounded-2xl bg-gradient-to-br from-fuchsia-500/30 to-indigo-500/30 p-1.5 backdrop-blur">
          <div className="grid h-28 w-44 place-items-center rounded-xl bg-gradient-to-br from-violet-200 to-indigo-200 shadow-inner">
            <Mascot emoji="🐰" hue={300} className="size-16" />
            <span className="mt-1 text-[10px] font-bold tracking-widest text-violet-700">DIRECTOR</span>
          </div>
        </div>
      </div>

      {/* ===== Headline ===== */}
      <h1 className="relative text-center font-heading text-3xl font-extrabold leading-snug text-white drop-shadow-md sm:text-5xl">
        AIと一緒に、<span className="text-sky-300">ワクワク</span>する
        <span className="text-amber-300">CM</span>を作ろう！
      </h1>

      {/* ===== 3 steps ===== */}
      <div className="relative mx-auto mt-7 flex max-w-3xl flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex flex-1 items-center gap-3">
            <motion.div
              whileHover={{ y: -3 }}
              className="flex w-full flex-col items-center gap-2 rounded-2xl bg-white/95 p-4 text-center card-soft"
            >
              <div className="flex items-center gap-2">
                <span className={`grid size-6 place-items-center rounded-full bg-gradient-to-br ${s.ring} text-xs font-bold text-white`}>
                  {s.n}
                </span>
                <span className="font-heading font-bold">{s.title}</span>
              </div>
              <Mascot emoji={s.emoji} hue={s.hue} className="size-16" />
              <span className="text-xs text-muted-foreground">{s.sub}</span>
            </motion.div>
            {i < STEPS.length - 1 && (
              <ArrowRight className="hidden size-6 shrink-0 text-white drop-shadow sm:block" />
            )}
          </div>
        ))}
      </div>

      {/* ===== CTA ===== */}
      <div className="relative mt-7 flex justify-center">
        <motion.button
          onClick={onStart}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className="bg-gradient-cta glow-cta inline-flex items-center gap-2 rounded-full px-8 py-3.5 font-heading text-lg font-extrabold text-white"
        >
          <Rocket className="size-5" /> 今すぐCMを作る！ <Sparkles className="size-4" />
        </motion.button>
      </div>

      {/* ===== Engine bar ===== */}
      <div className="relative mt-6">
        <EnginePills />
      </div>
    </section>
  );
}
