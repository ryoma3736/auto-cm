"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  previewUrl: string | null;
  onFile: (dataUrl: string, file: File) => void;
  onClear: () => void;
}

export function Dropzone({ previewUrl, onFile, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => onFile(reader.result as string, file);
      reader.readAsDataURL(file);
    },
    [onFile],
  );

  if (previewUrl) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="商品画像プレビュー" className="aspect-square w-full object-cover" />
        <button
          type="button"
          onClick={onClear}
          aria-label="画像を削除"
          className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-background/80 backdrop-blur transition-colors hover:bg-background"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      className={cn(
        "flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
        dragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/60 hover:bg-muted/40",
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
        <ImagePlus className="size-7" />
      </span>
      <span className="font-medium">商品画像をアップロード</span>
      <span className="text-sm text-muted-foreground">クリック、またはドラッグ&ドロップ（JPG / PNG）</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </button>
  );
}
