import { cn } from "@/lib/utils";

/**
 * 3D mascot renderer. Shows a glossy 3D PNG (Fluent 3D set for now; swap to bespoke
 * Gemini-generated characters by replacing the file under /public/3d). Optional soft
 * colored "pedestal" backdrop matches the reference design's character tiles.
 */
export function Mascot({
  src,
  className,
  backdrop = false,
  hue = 255,
}: {
  src: string;
  className?: string;
  backdrop?: boolean;
  hue?: number;
}) {
  return (
    <span className={cn("relative inline-flex items-center justify-center", className)}>
      {backdrop && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-[28%]"
          style={{
            background: `radial-gradient(120% 120% at 30% 18%, oklch(0.9 0.1 ${hue}), oklch(0.66 0.18 ${hue}))`,
            boxShadow: `inset 0 2px 6px oklch(1 0 0 / 0.4), 0 8px 18px -6px oklch(0.5 0.15 ${hue} / 0.5)`,
          }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        className="relative size-[76%] object-contain drop-shadow-[0_6px_9px_rgba(20,10,40,0.22)]"
      />
    </span>
  );
}
