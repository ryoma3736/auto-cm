"use client";

import { Check, Clock, Sparkles, Star } from "lucide-react";
import { motion } from "motion/react";
import type { EngineInfo } from "@/lib/engines/catalog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Props {
  info: EngineInfo;
  selected: boolean;
  recommended: boolean;
  live: boolean;
  onToggle: () => void;
}

export function EngineCard({ info, selected, recommended, live, onToggle }: Props) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      aria-pressed={selected}
      aria-label={`${info.name} を${selected ? "選択中" : "選択"}`}
      className={cn(
        "relative flex w-full flex-col gap-3 rounded-xl border p-4 text-left transition-colors",
        selected
          ? "border-brand bg-brand/10 ring-1 ring-brand"
          : "border-border bg-card hover:border-brand/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-heading text-base font-semibold">{info.name}</h3>
            {recommended && (
              <Badge className="bg-brand text-brand-foreground hover:bg-brand">
                <Sparkles className="mr-1 size-3" /> 推奨
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{info.provider}</p>
        </div>
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-brand bg-brand text-brand-foreground" : "border-muted-foreground/40",
          )}
        >
          {selected && <Check className="size-3.5" />}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">{info.description}</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn("size-3", i < info.quality ? "fill-brand text-brand" : "text-muted-foreground/30")}
            />
          ))}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" /> {info.estimatedTime}
        </span>
        <span className="tabular-nums">{info.costPerGeneration}/本</span>
        {!live && <Badge variant="outline">デモ</Badge>}
      </div>
    </motion.button>
  );
}
