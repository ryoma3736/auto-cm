"use client";

import { ArrowRight, Rocket, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Mascot } from "./mascot";
import { EnginePills } from "./engine-pills";

const STEPS = [
  { n: 1, title: "商品を入力", sub: "URL・画像をアップロード", src: "/3d/mascot-robot.png", ring: "from-blue-400 to-blue-600" },
  { n: 2, title: "AIが企画", sub: "台本・構成を自動生成", src: "/3d/mascot-ai.png", ring: "from-fuchsia-400 to-purple-600" },
  { n: 3, title: "CMを生成", sub: "5エンジンで同時生成", src: "/3d/mascot-wizard.png", ring: "from-emerald-400 to-teal-600" },
];

export function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative overflow-hidden rounded-[28px] shadow-[0_20px_60px_-24px_rgba(40,30,90,0.5)]">
      {/* Gemini-generated film-studio sky background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/3d/hero-bg.png" alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-500/15 via-transparent to-white/10" />

      <div className="relative z-10 px-4 pb-6 pt-8 sm:px-10 sm:pt-10">
        {/* Headline */}
        <h1 className="text-center font-heading text-3xl font-extrabold leading-snug text-white [text-shadow:0_3px_18px_rgba(20,30,80,0.5)] sm:text-5xl">
          AIと一緒に、<span className="text-sky-200">ワクワク</span>する
          <span className="text-amber-300">CM</span>を作ろう！
        </h1>

        {/* Steps + Director (flex → no overlap) */}
        <div className="mx-auto mt-8 flex max-w-5xl items-stretch gap-4">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="flex w-full flex-col items-center gap-2 rounded-3xl bg-white/95 p-4 text-center shadow-[0_12px_30px_-16px_rgba(40,30,90,0.5)] ring-1 ring-white/70"
                >
                  <div className="flex items-center gap-2">
                    <span className={`grid size-7 place-items-center rounded-full bg-gradient-to-br ${s.ring} text-sm font-bold text-white shadow`}>
                      {s.n}
                    </span>
                    <span className="font-heading text-base font-bold">{s.title}</span>
                  </div>
                  <Mascot src={s.src} className="size-24" />
                  <span className="text-xs font-medium text-muted-foreground">{s.sub}</span>
                </motion.div>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden size-6 shrink-0 text-white drop-shadow sm:block" />
                )}
              </div>
            ))}
          </div>

          {/* Director screen — own column, never overlaps */}
          <div className="hidden w-44 shrink-0 flex-col items-center justify-center gap-2.5 xl:flex">
            <span className="rounded-2xl bg-slate-900/90 px-5 py-2 font-heading text-lg font-extrabold text-white shadow-xl">
              完成！
            </span>
            <div className="w-full rounded-3xl bg-gradient-to-br from-fuchsia-400/50 to-indigo-500/50 p-2 shadow-xl">
              <div className="flex flex-col items-center rounded-2xl bg-white px-2 pb-2 pt-1">
                <Mascot src="/3d/mascot-director.png" className="size-24" />
                <span className="-mt-1 text-[11px] font-bold tracking-[0.2em] text-violet-700">DIRECTOR</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex justify-center">
          <motion.button
            onClick={onStart}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="bg-gradient-cta glow-cta inline-flex items-center gap-2.5 rounded-full px-9 py-4 font-heading text-lg font-extrabold text-white ring-2 ring-white/40"
          >
            <Rocket className="size-5" /> 今すぐCMを作る！ <Sparkles className="size-4" />
          </motion.button>
        </div>

        {/* Engine bar */}
        <div className="mt-7">
          <EnginePills />
        </div>
      </div>
    </section>
  );
}
