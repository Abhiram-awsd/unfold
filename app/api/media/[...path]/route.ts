import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { DEMO_MEDIA_DIR } from "@/lib/data/demo-store";
import { DEMO } from "@/lib/demo";

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain; charset=utf-8",
};

/**
 * Demo mode only: serves files saved by the demo store (avatars, project images, resume downloads).
 * Real deployments serve them from Supabase Storage, so this route returns 404 there.
 */
export async function GET(req: Request, { params }: RouteContext<"/api/media/[...path]">) {
  if (!DEMO) return new NextResponse(null, { status: 404 });
  const segments = (await params).path;
  // One flat folder: anything with a slash or dot-dot is not ours.
  const name = segments.length === 1 ? path.basename(segments[0]) : "";
  if (!name || name !== segments[0] || name.startsWith(".")) return new NextResponse(null, { status: 404 });
  const type = TYPES[path.extname(name).slice(1).toLowerCase()];
  if (!type) return new NextResponse(null, { status: 404 });

  const bytes = await fs.readFile(path.join(DEMO_MEDIA_DIR, name)).catch(() => null);
  if (!bytes) return new NextResponse(null, { status: 404 });

  const headers: Record<string, string> = {
    "content-type": type,
    "cache-control": "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
  };
  const download = new URL(req.url).searchParams.get("download");
  if (download) {
    const safe = download.replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(0, 100) || "download";
    headers["content-disposition"] = `attachment; filename="${safe.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
  }
  return new NextResponse(new Uint8Array(bytes), { headers });
}
