/**
 * Browser-side image preparation before upload: fixes orientation, crops avatars square,
 * scales screenshots down and re-encodes (screenshots as WebP where the browser can, avatars as JPEG).
 * Keeps uploads small and strips metadata such as GPS location.
 */
export type ImageKind = "avatar" | "project";

const LIMIT = { avatar: 512, project: 1600 } as const;

export class ImagePrepError extends Error {}

export async function prepareImage(file: File, kind: ImageKind): Promise<Blob> {
  if (!/^image\/(png|jpe?g|webp|gif|avif|bmp)$/i.test(file.type)) {
    throw new ImagePrepError("Use a JPG, PNG, WebP or GIF image.");
  }
  if (file.size > 25 * 1024 * 1024) throw new ImagePrepError("That image is over 25 MB. Try a smaller one.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImagePrepError("We couldn’t read that image. Try a JPG or PNG.");
  }

  const max = LIMIT[kind];
  let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;
  if (kind === "avatar") {
    const side = Math.min(sw, sh);
    sx = (sw - side) / 2;
    sy = (sh - side) / 2;
    sw = sh = side;
  }
  const scale = Math.min(1, max / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale)), h = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImagePrepError("Your browser couldn’t process that image.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  bitmap.close();

  const encode = (type: string, quality: number) => new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality));
  // Avatars are JPEG: they also appear in link-preview images, whose renderer can't draw WebP.
  if (kind === "project") {
    const webp = await encode("image/webp", 0.86);
    if (webp && webp.type === "image/webp") return webp;
  }
  // JPEG on a white ground (JPEG has no transparency).
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  const jpeg = await encode("image/jpeg", 0.88);
  if (!jpeg) throw new ImagePrepError("Your browser couldn’t process that image.");
  return jpeg;
}
