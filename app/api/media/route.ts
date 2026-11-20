import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentUserId, store, type ImageTarget } from "@/lib/data";
import { MAX_IMAGE_BYTES, sniffImage } from "@/lib/images";

export const runtime = "nodejs";

const Target = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("avatar") }),
  z.object({ kind: z.literal("project"), id: z.string().min(1).max(64) }),
]);

function error(message: string, status: number, cause?: unknown) {
  if (cause) console.error(`[api/media] ${message}`, cause);
  return NextResponse.json({ error: message }, { status });
}

function done(url: string | null) {
  revalidatePath("/dashboard");
  revalidatePath("/editor");
  return NextResponse.json({ url });
}

/** Upload an avatar or project image (multipart: kind, id?, file). Replaces the previous image. */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return error("Sign in to upload images.", 401);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return error("Send the image as multipart form data.", 400);
  }
  const target = Target.safeParse({ kind: form.get("kind"), id: form.get("id") ?? undefined });
  if (!target.success) return error("Say which image this is.", 400);
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return error("Choose an image to upload.", 400);
  if (file.size > MAX_IMAGE_BYTES) return error("That image is over 5 MB. Try a smaller one.", 413);

  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return error("Use a JPG, PNG, WebP or GIF image.", 415);

  const res = await store.setImage(userId, target.data as ImageTarget, { bytes, ...kind });
  if (!res.ok) return error(res.error.message, 500, res.error.cause);
  return done(res.value.url);
}

/** Remove an avatar or project image (JSON: { kind, id? }). */
export async function DELETE(req: Request) {
  const userId = await currentUserId();
  if (!userId) return error("Sign in to change images.", 401);
  const target = Target.safeParse(await req.json().catch(() => null));
  if (!target.success) return error("Say which image to remove.", 400);
  const res = await store.setImage(userId, target.data as ImageTarget, null);
  if (!res.ok) return error(res.error.message, 500, res.error.cause);
  return done(null);
}
