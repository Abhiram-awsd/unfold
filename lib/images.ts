import type { ImageExt } from "@/lib/data/types";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const TYPES: Record<ImageExt, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

/**
 * Identifies an image by its first bytes (never trust the file name or the browser's type).
 * Only formats every browser and the sharing-image renderer can show; SVG is refused because it can carry script.
 */
export function sniffImage(b: Uint8Array): { ext: ImageExt; type: string } | null {
  const at = (i: number, ...bytes: number[]) => bytes.every((v, j) => b[i + j] === v);
  let ext: ImageExt | null = null;
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) ext = "png";
  else if (at(0, 0xff, 0xd8, 0xff)) ext = "jpg";
  else if (at(0, 0x47, 0x49, 0x46, 0x38)) ext = "gif";
  else if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) ext = "webp";
  return ext ? { ext, type: TYPES[ext] } : null;
}
