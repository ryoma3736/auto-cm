import { put } from "@vercel/blob";
import { env, hasBlob } from "@/lib/env";

/**
 * Persist a remote provider video into Vercel Blob so the final URL is stable and
 * served from our own domain. Falls back to returning the source URL when Blob is
 * not configured (local dev).
 */
export async function persistVideo(sourceUrl: string, jobId: string, engine: string): Promise<string> {
  if (!hasBlob()) return sourceUrl;
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) return sourceUrl;
    const blob = await res.blob();
    const { url } = await put(`videos/${jobId}/${engine}.mp4`, blob, {
      access: "public",
      token: env.BLOB_READ_WRITE_TOKEN,
      contentType: "video/mp4",
    });
    return url;
  } catch {
    return sourceUrl;
  }
}

/** Store an uploaded product image and return its public URL. */
export async function persistUpload(file: Blob, jobId: string, name = "product"): Promise<string | null> {
  if (!hasBlob()) return null;
  const { url } = await put(`uploads/${jobId}/${name}`, file, {
    access: "public",
    token: env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: true,
  });
  return url;
}
