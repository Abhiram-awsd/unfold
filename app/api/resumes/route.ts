import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { currentUserId, store } from "@/lib/data";
import { DEMO } from "@/lib/demo";
import { ACCEPTED_TYPES, hasAiKey, MAX_RESUME_BYTES, parseResume, ResumeParseError, type ResumeData, type ResumeExt } from "@/lib/parse-resume";
import { SAMPLE_RESUME } from "@/lib/sample-resume";

export const runtime = "nodejs";
export const maxDuration = 60; // parsing a long PDF can take a while

const dev = process.env.NODE_ENV !== "production";

/**
 * Error response. The underlying cause is always logged to the server terminal; in development
 * it is also shown in the UI so setup problems (keys, Clerk ↔ Supabase connection) are obvious.
 */
function fail(error: string, status: number, cause?: unknown) {
  if (cause) console.error(`[api/resumes] ${error}`, cause);
  const detail = dev && cause ? ` (${describe(cause)})` : "";
  return NextResponse.json({ error: error + detail }, { status });
}

function describe(cause: unknown): string {
  if (cause && typeof cause === "object") {
    const c = cause as { code?: string; message?: string };
    if (c.code === "42501") return "Supabase treated you as signed out: connect Clerk to Supabase, see README step 3";
    if (c.code === "PGRST301" || /jwt|jws|token/i.test(c.message ?? "")) return `Supabase rejected the Clerk token: ${c.message}`;
    return [c.code, c.message].filter(Boolean).join(": ");
  }
  return String(cause);
}

/**
 * Upload a resume, read it with AI and create or update the user's portfolio.
 * On re-upload, existing edits are kept: only empty fields are filled and only
 * projects with new titles are added.
 */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return fail("Sign in to upload a resume.", 401);

  // Each upload costs an AI call: 5 an hour and 20 a day per account is plenty for real use.
  const [hour, day] = await Promise.all([
    store.uploadsSince(userId, new Date(Date.now() - 3_600_000).toISOString()),
    store.uploadsSince(userId, new Date(Date.now() - 86_400_000).toISOString()),
  ]);
  if (!DEMO && (hour >= 5 || day >= 20)) return fail(hour >= 5 ? "That’s 5 uploads in an hour. Try again a little later." : "That’s 20 uploads today. Try again tomorrow.", 429);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Send the file as multipart form data.", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a resume file to upload.", 400);
  if (file.size > MAX_RESUME_BYTES) return fail("That file is over 10 MB. Try a smaller export.", 413);

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!(ext in ACCEPTED_TYPES)) return fail("Upload a PDF, DOCX or TXT file.", 415);
  const resumeExt = ext as ResumeExt;
  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed: ResumeData;
  let sample = false;
  if (DEMO && !hasAiKey()) {
    // Demo mode without an AI key: use the sample resume so the flow can still be designed.
    parsed = SAMPLE_RESUME;
    sample = true;
  } else {
    try {
      parsed = await parseResume(buffer, resumeExt);
    } catch (err) {
      if (err instanceof ResumeParseError) return fail(err.message, 422);
      return fail("We couldn’t read that resume right now. Try again in a minute.", 502, err);
    }
  }

  const res = await store.importResume(userId, { file: buffer, ext: resumeExt, fileName: file.name, parsed });
  if (!res.ok) return fail(res.error.message, 500, res.error.cause);

  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true, added: res.value.added, sample });
}
