"use client";

import { useEffect, useState } from "react";
import { Clapperboard, Loader2, CheckCircle2, XCircle, Film } from "lucide-react";
import { loadRecent, RECENT_EVENT, type RecentItem } from "@/lib/recent";
import { ENGINE_ACCENT, ENGINE_SHORT } from "./engine-accent";
import type { EngineId } from "@/lib/engines/types";

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "たった今";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

export function RecentProjects() {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    const refresh = () => setItems(loadRecent());
    refresh();
    window.addEventListener(RECENT_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(RECENT_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <div className="rounded-3xl border border-border bg-card p-5 card-soft">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-base font-bold">最近の作品</h2>
        {items.length > 0 && (
          <span className="text-xs font-medium text-muted-foreground tabular-nums">{items.length}件</span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-gradient-primary text-white">
            <Film className="size-6" />
          </span>
          <p className="text-sm font-bold">まだ作品がありません</p>
          <p className="text-xs text-muted-foreground">
            上で商品画像をアップロードすると、最初のCMがここに並びます。
          </p>
        </div>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => {
            const first = (p.engines[0] as EngineId) ?? "sora2";
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl bg-muted/40 p-2.5 transition-colors hover:bg-muted/70"
              >
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${ENGINE_ACCENT[first]} text-white shadow-sm`}
                >
                  <Clapperboard className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{p.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {timeAgo(p.createdAt)} ・ {p.aspect} ・ {p.engines.map((e) => ENGINE_SHORT[e as EngineId] ?? e).join("/")}
                  </p>
                </div>
                <StatusPill status={p.status} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: RecentItem["status"] }) {
  if (status === "succeeded") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-600">
        <CheckCircle2 className="size-3" /> 完了
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-bold text-destructive">
        <XCircle className="size-3" /> 失敗
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">
      <Loader2 className="size-3 animate-spin" /> 生成中
    </span>
  );
}
