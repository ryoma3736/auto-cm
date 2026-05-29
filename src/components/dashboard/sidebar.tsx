"use client";

import {
  Clapperboard,
  FolderKanban,
  LayoutDashboard,
  History,
  Film,
  Palette,
  Settings,
  KeyRound,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Mascot } from "./mascot";

const NAV = [
  { icon: LayoutDashboard, label: "ダッシュボード", active: true },
  { icon: FolderKanban, label: "プロジェクト" },
  { icon: Film, label: "テンプレート" },
  { icon: History, label: "生成履歴" },
  { icon: Clapperboard, label: "動画ライブラリ" },
  { icon: Palette, label: "ブランドキット" },
  { icon: Settings, label: "設定" },
  { icon: KeyRound, label: "APIキー" },
];

export function Sidebar() {
  return (
    <aside className="bg-sidebar-grad sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 px-4 py-5 text-sidebar-foreground lg:flex">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2">
        <span className="bg-gradient-primary flex size-9 items-center justify-center rounded-xl">
          <Clapperboard className="size-5 text-white" />
        </span>
        <span className="font-heading text-xl font-extrabold">auto-cm</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => (
          <button
            key={item.label}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              item.active
                ? "bg-gradient-primary text-white shadow-lg"
                : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className="size-4.5" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* PRO plan credit widget */}
      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-amber-300">
          <Crown className="size-3.5" /> PRO PLAN
        </div>
        <p className="text-xs text-sidebar-muted">生成クレジット</p>
        <p className="font-heading text-2xl font-extrabold tabular-nums">
          850 <span className="text-sm font-medium text-sidebar-muted">/ 1,000</span>
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="bg-gradient-primary h-full w-[85%] rounded-full" />
        </div>
        <button className="bg-gradient-primary mt-3 w-full rounded-xl py-2 text-xs font-bold text-white">
          プランをアップグレード
        </button>
      </div>

      <Mascot emoji="🤖" hue={255} className="mx-auto size-20" />
    </aside>
  );
}
