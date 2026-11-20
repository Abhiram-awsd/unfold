/**
 * Transactional email through Resend's REST API (no SDK). Does nothing unless RESEND_API_KEY
 * and EMAIL_FROM are set, so the app runs the same without email configured.
 */
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendEmail(to: string, subject: string, text: string, replyTo?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from, to, subject: subject.replace(/[\r\n]+/g, " ").slice(0, 200), text,
        html: `<div style="font:15px/1.6 system-ui,sans-serif;color:#111;white-space:pre-wrap">${esc(text)}</div>`,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("[email] Resend refused the message", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("[email] couldn’t reach Resend", e);
    return false;
  }
}
