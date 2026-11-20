import type { PublicPortfolio } from "@/lib/supabase/types";
import { ROOT_DOMAIN } from "@/lib/site";
import { themeAttrs } from "@/lib/theme";

export type TemplateProps = { p: PublicPortfolio };
export type Project = PublicPortfolio["projects"][number];

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "·";
}

/** The name to show, never empty. */
export function displayName(name: string): string {
  return name.trim() || "Portfolio";
}

/** Repeats a short list until it has at least `min` items (for marquees and rows that need filling). */
export function fill<T>(list: T[], min: number): T[] {
  if (list.length === 0) return [];
  const out = [...list];
  while (out.length < min) out.push(...list);
  return out;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** "Org · 2022–2024", skipping empty parts. */
export function meta(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" · ");
}

/** Two-digit index, e.g. 1 → "01". */
export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** The word in a headline worth emphasising: the longest one, ignoring punctuation. */
export function keyWord(headline: string): string {
  const words = headline.match(/[\p{L}\p{N}’'-]+/gu) ?? [];
  return words.reduce((best, w) => (w.length > best.length ? w : best), "");
}

/** Splits text around the first occurrence of `word` so a template can style it. */
export function splitOn(text: string, word: string): [string, string, string] {
  const i = word ? text.indexOf(word) : -1;
  return i < 0 ? [text, "", ""] : [text.slice(0, i), word, text.slice(i + word.length)];
}

export function year(): number {
  return new Date().getFullYear();
}

/** "Made with Unfold" link shown on free plans; each template styles it through className. */
export function UnfoldBadge({ show, className }: { show: boolean; className: string }) {
  if (!show) return null;
  return (
    <a className={className} href={`https://${ROOT_DOMAIN}`} target="_blank" rel="noopener noreferrer">
      Made with Unfold
    </a>
  );
}

/** Root attributes for a template: light/dark, font pair and accent (see lib/theme.ts). */
export function rootAttrs(p: PublicPortfolio) {
  return themeAttrs(p.theme, p.theme_options);
}

/**
 * Marks an element as the place a field is shown, so the on-page editor can open it.
 * Harmless on public pages (a data attribute only).
 */
export function ed(field: string, id?: string): Record<string, string> {
  return id ? { "data-edit": field, "data-id": id } : { "data-edit": field };
}

/** Marks a link for click analytics (see lib/analytics.ts for the target format). */
export function track(target: string): { "data-track": string } {
  return { "data-track": target };
}

/** "Download résumé", plus the format when it isn't a PDF. */
export function resumeLabel(url: string): string {
  const ext = (url.split("?")[0].split(".").pop() ?? "").toLowerCase();
  return ext === "pdf" ? "Download résumé" : `Download résumé (${ext.toUpperCase()})`;
}

/** Compact repository details, e.g. "★ 1.2k · TypeScript". Empty when there are none. */
export function repoMeta(pr: Project): string {
  const stars = pr.stars == null ? null : `★ ${pr.stars >= 1000 ? `${(pr.stars / 1000).toFixed(pr.stars >= 10_000 ? 0 : 1)}k` : pr.stars}`;
  return [stars, pr.language].filter(Boolean).join(" · ");
}

/** A readable label for a project link: the site's host, e.g. "github.com/maya/unfold". */
export function linkHost(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "");
    return `${u.hostname.replace(/^www\./, "")}${path.length > 1 && path.length < 40 ? path : ""}`;
  } catch {
    return url;
  }
}
