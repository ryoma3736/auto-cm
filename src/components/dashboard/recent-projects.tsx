import { MoreVertical, Loader2 } from "lucide-react";

const PROJECTS = [
  { name: "美容液 CM", at: "2025/05/25 14:30", status: "done", img: "/thumbs/proj-1.jpg" },
  { name: "コーヒーショップ", at: "2025/05/25 11:20", status: "done", img: "/thumbs/proj-2.jpg" },
  { name: "新商品プロモーション", at: "2025/05/24 18:45", status: "running", img: "/thumbs/proj-3.jpg" },
  { name: "ECサイト広告", at: "2025/05/24 09:15", status: "done", img: "/thumbs/proj-4.jpg" },
];

export function RecentProjects() {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 card-soft">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-base font-bold">最近のプロジェクト</h2>
        <button className="text-xs font-semibold text-brand-purple hover:underline">すべて見る →</button>
      </div>
      <ul className="flex flex-col gap-2.5">
        {PROJECTS.map((p) => (
          <li key={p.name} className="flex items-center gap-3 rounded-2xl bg-muted/40 p-2.5 transition-colors hover:bg-muted/70">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.img} alt="" className="size-11 shrink-0 rounded-xl object-cover shadow-sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{p.name}</p>
              <p className="text-xs text-muted-foreground tabular-nums">{p.at}</p>
            </div>
            {p.status === "done" ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">完了</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                <Loader2 className="size-3 animate-spin" /> 生成中…
              </span>
            )}
            <button className="text-muted-foreground transition-colors hover:text-foreground" aria-label="メニュー">
              <MoreVertical className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
