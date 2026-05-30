import { cn } from "@/lib/utils";

/**
 * 3D mascot renderer. Shows a Gemini-generated 3D character (white-background PNG/JPEG
 * under /public/3d). White background blends on white cards; on colored surfaces wrap the
 * Mascot in a white rounded tile at the call site.
 */
export function Mascot({ src, className }: { src: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      className={cn("object-contain drop-shadow-[0_8px_12px_rgba(20,10,40,0.18)]", className)}
    />
  );
}
