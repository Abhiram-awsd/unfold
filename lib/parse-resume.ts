import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import mammoth from "mammoth";
import { extractText } from "unpdf";
import { z } from "zod";
import { normalizeUrl } from "@/lib/links";

/**
 * Resume reading. The provider is picked by which key is set in .env.local:
 *  - GEMINI_API_KEY     → Google Gemini (free tier on Flash models, reads PDFs directly)
 *  - OPENROUTER_API_KEY → OpenRouter (default model "openrouter/free"; PDFs are converted to text)
 *  - ANTHROPIC_API_KEY  → Claude (paid, reads PDFs directly, most reliable output)
 * If several keys are set, the first in that order wins. AI_PROVIDER=gemini|openrouter|anthropic forces one.
 */

/** What Unfold keeps from a resume. Every field is required (nullable when absent) for structured output. */
export const ResumeSchema = z.object({
  name: z.string().describe("Full name exactly as written"),
  headline: z.string().describe("One line, first person, under 12 words, based only on the resume. Example: Designing calm software for busy teams."),
  bio: z.string().describe("Two or three sentences in first person summarising experience. Use only facts from the resume."),
  location: z.string().nullable(),
  email: z.string().nullable(),
  skills: z.array(z.string()).describe("Skills and tools, deduplicated, most relevant first, at most 15"),
  links: z
    .array(
      z.object({
        label: z.string().describe("Short name: LinkedIn, GitHub, Website, Dribbble, Behance, X, Medium…"),
        url: z.string().describe("The URL exactly as written in the resume"),
      }),
    )
    .describe("Profile and portfolio links found in the resume, at most 6. Never invent one."),
  education: z
    .array(
      z.object({
        school: z.string().describe("School, university, bootcamp or certifying body"),
        degree: z.string().nullable().describe("Degree, course or certificate name"),
        period: z.string().nullable().describe("Dates as written"),
      }),
    )
    .describe("Education and certifications, most recent first, at most 5"),
  projects: z
    .array(
      z.object({
        title: z.string().describe("A short project or achievement title, 2–5 words"),
        organization: z.string().nullable().describe("Employer, client or school"),
        period: z.string().nullable().describe("Dates as written, e.g. 2022–2024"),
        summary: z.string().describe("One sentence describing the work"),
        story: z
          .string()
          .describe(
            "A short case study, 2–4 sentences, first person: the problem, what I did, the result. Only facts and numbers stated in the resume.",
          ),
      }),
    )
    .describe(
      "One entry per role or notable project, most recent first, at most 8. For students or career changers with no jobs, use internships, academic, personal, freelance or volunteer projects instead.",
    ),
});

export type ResumeData = z.infer<typeof ResumeSchema>;

export const ACCEPTED_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
} as const;
export type ResumeExt = keyof typeof ACCEPTED_TYPES;
export const MAX_RESUME_BYTES = 10 * 1024 * 1024;

const INSTRUCTIONS = `You turn resumes into portfolio content.

Rules:
- Use only information that is in the resume. Never invent employers, dates, numbers, results or skills.
- Keep names, titles, dates and figures exactly as written.
- If something is missing, use null (or an empty list) instead of guessing.
- Write in plain, confident first person. No buzzwords.
- Resumes come in every shape: one page or five, a student with no jobs, a freelancer, someone switching careers, any language. Work with what is there.
- Write the portfolio text in the same language as the resume.`;

export class ResumeParseError extends Error {}

const clean = (v: string | null | undefined) => (v ?? "").replace(/\s+/g, " ").trim();

/** Trims whitespace, removes duplicates and empty entries, and applies the size caps. */
export function tidyResume(r: ResumeData): ResumeData {
  const seen = new Set<string>();
  const links = r.links
    .map(l => ({ label: clean(l.label) || "Link", url: normalizeUrl(l.url) }))
    .filter((l): l is { label: string; url: string } => !!l.url && !seen.has(l.url) && !!seen.add(l.url))
    .slice(0, 6);
  return {
    name: clean(r.name),
    headline: clean(r.headline),
    bio: (r.bio ?? "").trim(),
    location: clean(r.location) || null,
    email: clean(r.email) || null,
    skills: Array.from(new Set(r.skills.map(clean).filter(Boolean))).slice(0, 15),
    links,
    education: r.education
      .map(e => ({ school: clean(e.school), degree: clean(e.degree) || null, period: clean(e.period) || null }))
      .filter(e => e.school)
      .slice(0, 5),
    projects: r.projects
      .map(p => ({
        title: clean(p.title),
        organization: clean(p.organization) || null,
        period: clean(p.period) || null,
        summary: clean(p.summary),
        story: (p.story ?? "").trim(),
      }))
      .filter(p => p.title)
      .slice(0, 8),
  };
}

type Provider = "gemini" | "openrouter" | "anthropic";

/** Reads a resume file and returns structured portfolio content. */
export async function parseResume(file: Buffer, ext: ResumeExt): Promise<ResumeData> {
  const p = provider();
  const parsed =
    p === "gemini" ? await withGemini(file, ext) : p === "openrouter" ? await withOpenRouter(file, ext) : await withClaude(file, ext);
  return tidyResume(parsed);
}

function provider(): Provider {
  const forced = process.env.AI_PROVIDER?.toLowerCase();
  if (forced === "gemini" || forced === "openrouter" || forced === "anthropic") return forced;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  throw new Error("No AI key set. Add GEMINI_API_KEY, OPENROUTER_API_KEY or ANTHROPIC_API_KEY to .env.local.");
}

/** Plain text from any accepted file. */
async function fileText(file: Buffer, ext: ResumeExt): Promise<string> {
  let text: string;
  if (ext === "pdf") {
    try {
      text = (await extractText(new Uint8Array(file), { mergePages: true })).text;
    } catch {
      throw new ResumeParseError("We couldn’t open that PDF. Try exporting it again.");
    }
  } else if (ext === "docx") {
    text = (await mammoth.extractRawText({ buffer: file })).value;
  } else {
    text = file.toString("utf8");
  }
  if (text.trim().length < 40) {
    throw new ResumeParseError("We couldn’t find any text in that file. If it’s a scanned PDF, export a text PDF instead.");
  }
  return text.slice(0, 60_000);
}

/* ---------- Google Gemini (generateContent REST API) ---------- */

async function withGemini(file: Buffer, ext: ResumeExt): Promise<ResumeData> {
  // "gemini-flash-latest" always points at Google's newest Flash model, which has a free tier.
  const model = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const parts =
    ext === "pdf"
      ? [{ inlineData: { mimeType: "application/pdf", data: file.toString("base64") } }, { text: "Here is my resume. Extract the portfolio content." }]
      : [{ text: `Here is my resume. Extract the portfolio content.\n\n<resume>\n${await fileText(file, ext)}\n</resume>` }];

  // Try with a strict JSON schema first. If this model or key rejects the schema field,
  // fall back to plain JSON mode with the schema in the instructions. One extra retry on malformed output.
  const attempts = [true, false, false];
  for (const strictSchema of attempts) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "", "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: strictSchema ? INSTRUCTIONS : `${INSTRUCTIONS}\n\nReply with only a JSON object matching this JSON Schema:\n${JSON.stringify(JSON_SCHEMA)}` }],
        },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          ...(strictSchema ? { responseJsonSchema: JSON_SCHEMA } : {}),
        },
      }),
    });

    if (res.status === 429) throw new ResumeParseError("The free AI quota is used up for now. Wait a minute and try again.");
    if (res.status === 400 && strictSchema) continue; // schema not accepted: retry in plain JSON mode
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);

    const body = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const raw = body.candidates?.[0]?.content?.parts?.map(p => p.text ?? "").join("") ?? "";
    const result = ResumeSchema.safeParse(parseJsonLoosely(raw));
    if (result.success) return result.data;
  }
  throw new ResumeParseError("We couldn’t read that resume. Try again, or upload a PDF export.");
}

/* ---------- OpenRouter (OpenAI-compatible chat completions) ---------- */

/** JSON Schema for the response, without the "$schema" key some providers reject. */
const JSON_SCHEMA: Record<string, unknown> = (() => {
  const schema: Record<string, unknown> = { ...z.toJSONSchema(ResumeSchema) };
  delete schema.$schema;
  return schema;
})();

async function withOpenRouter(file: Buffer, ext: ResumeExt): Promise<ResumeData> {
  const text = await fileText(file, ext);
  const model = process.env.OPENROUTER_MODEL ?? "openrouter/free";
  const messages = [
    {
      role: "system",
      content: `${INSTRUCTIONS}\n\nReply with only a JSON object that matches this JSON Schema. No prose, no code fences.\n${JSON.stringify(JSON_SCHEMA)}`,
    },
    { role: "user", content: `Here is my resume. Extract the portfolio content.\n\n<resume>\n${text}\n</resume>` },
  ];

  // Free models vary in quality; one retry fixes most malformed replies.
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "X-Title": "Unfold",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        response_format: { type: "json_schema", json_schema: { name: "resume", strict: true, schema: JSON_SCHEMA } },
      }),
    });

    if (res.status === 429) throw new ResumeParseError("The free AI model is busy right now. Wait a minute and try again.");
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);

    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string | null } }> };
    const raw = body.choices?.[0]?.message?.content ?? "";
    const result = ResumeSchema.safeParse(parseJsonLoosely(raw));
    if (result.success) return result.data;
  }
  throw new ResumeParseError("We couldn’t read that resume. Try again, or upload a PDF export.");
}

/** Accepts a bare JSON object, or one wrapped in code fences or surrounded by stray text. */
function parseJsonLoosely(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

/* ---------- Claude ---------- */

let anthropicClient: Anthropic | null = null;
/** Created on first use so builds don’t need an API key. */
function anthropic() {
  anthropicClient ??= new Anthropic(); // reads ANTHROPIC_API_KEY
  return anthropicClient;
}

async function withClaude(file: Buffer, ext: ResumeExt): Promise<ResumeData> {
  const content: Anthropic.ContentBlockParam[] =
    ext === "pdf"
      ? [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: file.toString("base64") } },
          { type: "text", text: "Here is my resume. Extract the portfolio content." },
        ]
      : [{ type: "text", text: `Here is my resume. Extract the portfolio content.\n\n<resume>\n${await fileText(file, ext)}\n</resume>` }];

  const message = await anthropic().messages.parse({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
    max_tokens: 4096,
    system: INSTRUCTIONS,
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(ResumeSchema) },
  });

  if (!message.parsed_output) throw new ResumeParseError("We couldn’t read that resume. Try a PDF export.");
  return message.parsed_output;
}

/** True when any AI provider key is configured. */
export function hasAiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY);
}
