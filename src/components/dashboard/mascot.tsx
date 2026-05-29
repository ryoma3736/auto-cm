import { cn } from "@/lib/utils";

/**
 * Lightweight CSS/SVG mascot placeholder — stands in for the 3D character art.
 * Swap `src` later to drop in a real PNG/SVG without touching layout.
 */
export function Mascot({
  className,
  src,
  hue = 255,
  emoji = "🤖",
}: {
  className?: string;
  src?: string;
  hue?: number;
  emoji?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" aria-hidden className={cn("object-contain", className)} />;
  }
  return (
    <div
      aria-hidden
      className={cn(
        "flex items-center justify-center rounded-2xl text-2xl shadow-inner",
        className,
      )}
      style={{
        background: `radial-gradient(120% 120% at 30% 20%, oklch(0.85 0.12 ${hue} / 0.9), oklch(0.6 0.18 ${hue} / 0.85))`,
      }}
    >
      <span className="drop-shadow-sm">{emoji}</span>
    </div>
  );
}
