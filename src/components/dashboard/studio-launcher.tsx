"use client";

import { useState } from "react";
import { Hero } from "./hero";
import { Studio } from "@/components/studio/studio";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { EngineId } from "@/lib/engines/types";

export function StudioLauncher({
  liveEngines,
  demo,
}: {
  liveEngines: EngineId[];
  demo: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Hero onStart={() => setOpen(true)} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-extrabold">
              <span className="text-gradient-primary">CMを作る</span> 🎬
            </DialogTitle>
            <DialogDescription>
              商品画像をアップロード → AIが解析・台本生成 → エンジンを選んで生成。
              {demo && "（現在デモモード：サンプル動画で全フローを体験できます）"}
            </DialogDescription>
          </DialogHeader>
          <Studio liveEngines={liveEngines} />
        </DialogContent>
      </Dialog>
    </>
  );
}
