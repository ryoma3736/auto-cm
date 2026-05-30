import { Sparkles, TrendingUp, Zap, Users, CheckCircle2 } from "lucide-react";
import { Mascot } from "./mascot";

const STATS = [
  { icon: CheckCircle2, label: "総生成数", value: "128", delta: "↑ 22%", sub: "今月", grad: "from-violet-400 to-purple-500" },
  { icon: Sparkles, label: "完了率", value: "98.5%", delta: "↑ 5%", sub: "今月", grad: "from-amber-400 to-orange-500" },
  { icon: Zap, label: "平均生成時間", value: "62秒", delta: "↓ 15%", sub: "今月", grad: "from-blue-400 to-indigo-500" },
  { icon: Users, label: "使用クレジット", value: "850", delta: "/ 1,000", sub: "今月", grad: "from-pink-400 to-rose-500" },
];

export function StatCards() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {STATS.map((s) => (
        <div key={s.label} className="rounded-2xl border border-border bg-card p-4 card-soft">
          <span className={`mb-2 grid size-9 place-items-center rounded-xl bg-gradient-to-br ${s.grad} text-white`}>
            <s.icon className="size-4.5" />
          </span>
          <p className="text-xs text-muted-foreground">{s.label}</p>
          <p className="font-heading text-2xl font-extrabold tabular-nums">
            {s.value} <span className="text-xs font-bold text-emerald-600">{s.delta}</span>
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="size-3" /> {s.sub}
          </p>
        </div>
      ))}

      <div className="bg-gradient-primary col-span-2 flex items-center justify-between gap-2 rounded-2xl p-4 text-white lg:col-span-1">
        <p className="font-heading text-sm font-bold leading-snug">
          すごいCMが
          <br />
          できたよ〜！
        </p>
        <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white/95 shadow">
          <Mascot src="/3d/mascot-party.png" className="size-[88%]" />
        </div>
      </div>
    </div>
  );
}
