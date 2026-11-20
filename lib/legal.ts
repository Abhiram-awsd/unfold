import { ROOT_DOMAIN } from "@/lib/site";

/** Where privacy and support requests go. Set NEXT_PUBLIC_CONTACT_EMAIL before launch. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? `hello@${ROOT_DOMAIN.split(":")[0]}`;
export const LEGAL_UPDATED = "12 November 2026";

/** The AI service that reads resumes, named in the privacy policy. Follows the same key order as lib/parse-resume.ts. */
export function aiProviderName(): string {
  const forced = process.env.AI_PROVIDER;
  if (forced === "anthropic" || (!forced && !process.env.GEMINI_API_KEY && !process.env.OPENROUTER_API_KEY && process.env.ANTHROPIC_API_KEY)) return "Anthropic (Claude)";
  if (forced === "openrouter" || (!forced && !process.env.GEMINI_API_KEY && process.env.OPENROUTER_API_KEY)) return "OpenRouter and the model provider it routes to";
  return "Google (Gemini)";
}
