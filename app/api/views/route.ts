import { NextResponse } from "next/server";
import { z } from "zod";
import { isTarget, sourceOf } from "@/lib/analytics";
import { store } from "@/lib/data";

const View = z.object({
  portfolioId: z.string().min(1).max(64),
  path: z.string().max(200).default("/"),
  referrer: z.string().max(1000).optional(),
  utm: z.string().max(100).optional(),
});
const Click = z.object({
  portfolioId: z.string().min(1).max(64),
  click: z.string().min(1).max(300),
});

/** Beacon from public pages: one view per page load, plus clicks on projects, links, email and resume. */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const click = Click.safeParse(json);
  if (click.success) {
    if (!isTarget(click.data.click)) return new NextResponse(null, { status: 400 });
    await store.recordClick(click.data.portfolioId, click.data.click);
    return new NextResponse(null, { status: 204 });
  }

  const view = View.safeParse(json);
  if (!view.success) return new NextResponse(null, { status: 400 });
  const host = (req.headers.get("host") ?? "").split(":")[0] || null;
  const source = sourceOf(view.data.referrer, view.data.utm, host);
  await store.recordView(view.data.portfolioId, view.data.path, source);
  return new NextResponse(null, { status: 204 });
}
