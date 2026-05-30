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

      {/* Friendly mascot anchored to the bottom */}
      <div className="mt-auto flex flex-col items-center gap-2 pt-4">
        <div className="grid size-24 place-items-center rounded-3xl bg-white/95 shadow-lg">
          <Mascot src="/3d/mascot-robot-wave.png" className="size-[88%]" />
        </div>
        <p className="text-center text-xs text-sidebar-muted">画像1枚から、CMを。</p>
      </div>
    </aside>
  );
}
