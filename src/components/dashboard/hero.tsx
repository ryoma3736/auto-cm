"use client";

import { ArrowRight, Rocket, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Mascot } from "./mascot";
import { EnginePills } from "./engine-pills";

const STEPS = [
  { n: 1, title: "商品を入力", sub: "URL・画像をアップロード", src: "/3d/mascot-box.png", hue: 255, ring: "from-blue-400 to-blue-600" },
  { n: 2, title: "AIが企画", sub: "台本・構成を自動生成", src: "/3d/mascot-clap.png", hue: 320, ring: "from-fuchsia-400 to-purple-600" },
  { n: 3, title: "CMを生成", sub: "5エンジンで同時生成", src: "/3d/mascot-sparkle.png", hue: 150, ring: "from-emerald-400 to-teal-600" },
];

export function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="bg-gradient-hero relative overflow-hidden rounded-[28px] px-4 pb-6 pt-7 shadow-[0_20px_60px_-24px_rgba(40,30,90,0.5)] sm:px-10 sm:pt-9">
      {/* ===== Decorative film-set scene ===== */}
      <div className="pointer-events-none absolute inset-0 select-none">
        {/* clouds */}
        <div className="absolute left-[6%] top-10 h-12 w-32 rounded-full bg-white/75 blur-xl" />
        <div className="absolute left-[28%] top-5 h-9 w-24 rounded-full bg-white/60 blur-lg" />
        <div className="absolute right-[34%] top-12 h-10 w-28 rounded-full bg-white/55 blur-xl" />
        {/* 3D props */}
        {/* eslint-disable @next/next/no-img-element */}
        <img src="/3d/prop-camera.png" alt="" className="absolute left-3 top-5 size-14 rotate-[-8deg] drop-shadow-lg sm:size-20" />
        <img src="/3d/prop-clap.png" alt="" className="absolute bottom-5 left-4 size-12 rotate-[6deg] drop-shadow-lg sm:size-16" />
        <img src="/3d/prop-rainbow.png" alt="" className="absolute right-4 top-4 size-16 drop-shadow-lg sm:size-24" />
        <img src="/3d/prop-balloon.png" alt="" className="absolute right-[20%] top-8 size-10 drop-shadow-lg sm:size-14" />
        {/* eslint-enable @next/next/no-img-element */}
        <Sparkles className="absolute left-[15%] top-20 size-5 text-white/80" />
        <Sparkles className="absolute right-[36%] top-7 size-4 text-amber-200" />
      </div>

      {/* "完成！" badge + director screen (xl only) */}
      <div className="pointer-events-none absolute right-8 top-1/2 z-10 hidden -translate-y-1/2 flex-col items-center gap-2.5 xl:flex">
        <span className="rounded-2xl bg-slate-900/90 px-5 py-2 font-heading text-xl font-extrabold text-white shadow-xl">
          完成！
        </span>
        <div className="rounded-3xl bg-gradient-to-br from-fuchsia-400/40 to-indigo-500/40 p-2 shadow-xl backdrop-blur">
          <div className="flex h-32 w-48 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-200 shadow-inner">
            <Mascot src="/3d/mascot-rabbit.png" className="size-20" />
            <span className="-mt-1 text-[11px] font-bold tracking-[0.2em] text-violet-700">DIRECTOR</span>
          </div>
        </div>
      </div>

      {/* ===== Headline ===== */}
      <h1 className="relative z-[1] text-center font-heading text-3xl font-extrabold leading-snug text-white [text-shadow:0_2px_12px_rgba(30,20,80,0.35)] sm:text-5xl">
        AIと一緒に、<span className="text-sky-200">ワクワク</span>する
        <span className="text-amber-300">CM</span>を作ろう！
      </h1>

      {/* ===== 3 steps ===== */}
      <div className="relative z-[1] mx-auto mt-8 flex max-w-3xl flex-col items-stretch gap-3 sm:flex-row sm:items-stretch">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex flex-1 items-center gap-2">
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex w-full flex-col items-center gap-2.5 rounded-3xl bg-white/95 p-5 text-center shadow-[0_12px_30px_-16px_rgba(40,30,90,0.5)] ring-1 ring-white/60"
            >
              <div className="flex items-center gap-2">
                <span className={`grid size-7 place-items-center rounded-full bg-gradient-to-br ${s.ring} text-sm font-bold text-white shadow`}>
                  {s.n}
                </span>
                <span className="font-heading text-base font-bold">{s.title}</span>
              </div>
              <Mascot src={s.src} backdrop hue={s.hue} className="size-24" />
              <span className="text-xs font-medium text-muted-foreground">{s.sub}</span>
            </motion.div>
            {i < STEPS.length - 1 && (
              <ArrowRight className="hidden size-7 shrink-0 text-white drop-shadow sm:block" />
            )}
          </div>
        ))}
      </div>

      {/* ===== CTA ===== */}
      <div className="relative z-[1] mt-8 flex justify-center">
        <motion.button
          onClick={onStart}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="bg-gradient-cta glow-cta inline-flex items-center gap-2.5 rounded-full px-9 py-4 font-heading text-lg font-extrabold text-white ring-2 ring-white/30"
        >
          <Rocket className="size-5" /> 今すぐCMを作る！ <Sparkles className="size-4" />
        </motion.button>
      </div>

      {/* ===== Engine bar ===== */}
      <div className="relative z-[1] mt-7">
        <EnginePills />
      </div>
    </section>
  );
}
