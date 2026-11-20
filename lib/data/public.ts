import type { Portfolio, Project, PublicPortfolio } from "@/lib/supabase/types";

/** http(s) (and for links, mailto) only, so a stored "javascript:" URL can never reach a visitor's browser. */
export function safeUrl(url: unknown, allowMail = false): string | null {
  if (typeof url !== "string" || !url) return null;
  if (url.startsWith("/api/media/")) return url; // demo-mode files served by this app
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" || (allowMail && u.protocol === "mailto:") ? u.toString() : null;
  } catch {
    return null;
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);

/**
 * Normalises a public portfolio from either store: fills missing fields (older rows,
 * older RPC versions) and drops any URL that isn't http(s). Templates can then trust every field.
 */
export function cleanPublic(raw: Record<string, unknown>): PublicPortfolio {
  const arr = (v: unknown) => (Array.isArray(v) ? v : []) as Array<Record<string, unknown>>;
  return {
    id: str(raw.id),
    slug: str(raw.slug),
    theme: str(raw.theme) as PublicPortfolio["theme"],
    show_badge: raw.show_badge !== false,
    name: str(raw.name),
    headline: str(raw.headline),
    bio: str(raw.bio),
    location: strOrNull(raw.location),
    email: strOrNull(raw.email),
    skills: (Array.isArray(raw.skills) ? raw.skills : []).filter((s): s is string => typeof s === "string" && s.length > 0),
    links: arr(raw.links)
      .map(l => ({ label: str(l.label) || "Link", url: safeUrl(l.url, true) }))
      .filter((l): l is { label: string; url: string } => !!l.url),
    education: arr(raw.education)
      .filter(e => str(e.school))
      .map(e => ({ school: str(e.school), degree: strOrNull(e.degree), period: strOrNull(e.period) })),
    avatar_url: safeUrl(raw.avatar_url),
    theme_options: raw.theme_options && typeof raw.theme_options === "object" && !Array.isArray(raw.theme_options) ? (raw.theme_options as PublicPortfolio["theme_options"]) : {},
    contact: raw.contact === true,
    resume_url: safeUrl(raw.resume_url),
    projects: arr(raw.projects).map(pr => ({
      id: str(pr.id),
      title: str(pr.title),
      organization: strOrNull(pr.organization),
      period: strOrNull(pr.period),
      summary: str(pr.summary),
      story: str(pr.story),
      image_url: safeUrl(pr.image_url),
      link_url: safeUrl(pr.link_url),
      stars: num(pr.stars),
      language: strOrNull(pr.language),
    })),
  };
}

/** File name for a resume download, e.g. "Maya-Iyer-Resume.pdf". */
export function downloadName(name: string, ext: string): string {
  const base = name.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || "Resume";
  return base === "Resume" ? `Resume.${ext}` : `${base}-Resume.${ext}`;
}

/**
 * The public view of an owner's own data, with get_public_portfolio()'s privacy rules:
 * approved projects only (in order), email only if shown. Used by the demo store and the editor preview.
 */
export function previewOf(p: Portfolio, projects: Project[]): PublicPortfolio {
  return cleanPublic({
    id: p.id,
    slug: p.slug,
    theme: p.theme,
    show_badge: p.show_badge,
    name: p.name,
    headline: p.headline,
    bio: p.bio,
    location: p.location,
    email: p.show_email ? p.email : null,
    skills: p.skills,
    links: p.links,
    education: p.education,
    avatar_url: p.avatar_url,
    theme_options: p.theme_options,
    contact: p.contact_enabled,
    resume_url: p.resume_url,
    projects: [...projects]
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
      .filter(x => x.approved)
      .map(({ id, title, organization, period, summary, story, image_url, link_url, stars, language }) => ({ id, title, organization, period, summary, story, image_url, link_url, stars, language })),
  });
}
