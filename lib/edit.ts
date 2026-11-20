import { normalizeUrl } from "@/lib/links";

/** "Figma, Prototyping, , Figma" → ["Figma", "Prototyping"] (max 20, each max 40 characters). */
export function skillList(raw: string): string[] {
  return Array.from(new Set(raw.split(",").map(s => s.trim().slice(0, 40)).filter(Boolean))).slice(0, 20);
}

/** An http(s) URL, adding https:// when it's missing. Mail links aren't allowed for projects. */
export function webUrl(raw: string): string | null {
  const url = normalizeUrl(raw);
  return url && /^https?:/i.test(url) ? url : null;
}
