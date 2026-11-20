import { createHash } from "node:crypto";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/data";
import { sendEmail } from "@/lib/email";
import { ROOT_DOMAIN } from "@/lib/site";

export const runtime = "nodejs";

const Body = z.object({
  portfolioId: z.string().min(1).max(64),
  name: z.string().trim().min(1, "Add your name").max(80, "Keep your name under 80 characters"),
  email: z.email("Enter a valid email address").max(200),
  message: z.string().trim().min(1, "Write a message").max(3000, "Keep your message under 3,000 characters"),
  company: z.string().max(200).optional(), // spam trap: real visitors leave it empty
});

/** A salted hash of the sender's IP, used only to rate-limit; the IP itself is never stored. */
function senderHash(req: Request, portfolioId: string): string {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${process.env.CONTACT_HASH_SALT ?? "unfold-contact"}:${portfolioId}:${ip}`).digest("hex");
}

/** Contact form on a public portfolio. The message goes to the owner's inbox in the dashboard. */
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Check the form and try again." }, { status: 400 });
  const { portfolioId, name, email, message, company } = body.data;
  // Bots fill every field. Pretend it worked so they don't retry.
  if (company) return NextResponse.json({ ok: true });

  const res = await store.sendMessage(portfolioId, { name, email, message }, senderHash(req, portfolioId));
  if (res.ok) {
    // Tell the owner by email once the response has gone out (skipped when email isn't configured).
    after(async () => {
      const owner = await store.ownerContact(portfolioId);
      if (!owner) return;
      const inbox = `${/^(localhost|127\.0\.0\.1)/.test(ROOT_DOMAIN) ? "http" : "https"}://${ROOT_DOMAIN}/dashboard/inbox`;
      await sendEmail(owner.email, `New message from ${name} on your portfolio`, `${name} (${email}) wrote:\n\n${message}\n\nReply to this email to answer them, or open your inbox: ${inbox}`, email);
    });
    return NextResponse.json({ ok: true });
  }
  if (res.error.cause) console.error("[api/contact]", res.error.cause);
  const status = res.error.code === "limited" ? 429 : res.error.code === "invalid" ? 400 : res.error.code === "closed" ? 404 : 500;
  return NextResponse.json({ error: res.error.message }, { status });
}
