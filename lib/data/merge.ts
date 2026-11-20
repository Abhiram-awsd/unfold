import type { ResumeData } from "@/lib/parse-resume";
import type { Education, Portfolio, PortfolioLink } from "@/lib/supabase/types";
import { RESERVED_SLUGS, SLUG_PATTERN, slugify } from "@/lib/site";

/** Fields for a brand-new portfolio created from a parsed resume. */
export function newPortfolioFields(parsed: ResumeData) {
  return {
    name: parsed.name,
    headline: parsed.headline,
    bio: parsed.bio,
    location: parsed.location,
    email: parsed.email,
    skills: parsed.skills,
    links: parsed.links,
    education: parsed.education,
  };
}

/**
 * Re-upload: keep everything the user already has and only fill gaps.
 * Text fields fill when empty; skills, links and education are merged without duplicates.
 */
export function mergedPortfolioFields(existing: Portfolio, parsed: ResumeData) {
  const links: PortfolioLink[] = [...existing.links];
  for (const l of parsed.links) if (!links.some(x => x.url === l.url)) links.push(l);
  const education: Education[] = [...existing.education];
  for (const e of parsed.education) if (!education.some(x => x.school.toLowerCase() === e.school.toLowerCase())) education.push(e);
  return {
    name: existing.name || parsed.name,
    headline: existing.headline || parsed.headline,
    bio: existing.bio || parsed.bio,
    location: existing.location ?? parsed.location,
    email: existing.email ?? parsed.email,
    skills: Array.from(new Set([...existing.skills, ...parsed.skills])).slice(0, 20),
    links: links.slice(0, 8),
    education: education.slice(0, 6),
  };
}

/** Projects from the resume whose titles the user doesn't already have. */
export function newProjects(parsed: ResumeData, existingTitles: string[]) {
  const known = new Set(existingTitles.map(t => t.trim().toLowerCase()));
  return parsed.projects.filter(p => !known.has(p.title.trim().toLowerCase()));
}

/** Candidate web addresses for a name: "maya-iyer", then "maya-iyer-4821"… */
export function slugCandidates(name: string, attempts = 6): string[] {
  const base = slugify(name) || "portfolio";
  const out: string[] = [];
  for (let i = 0; i < attempts; i++) {
    const suffix = i === 0 ? "" : `-${Math.floor(Math.random() * 9000 + 1000)}`;
    let slug = `${base.slice(0, 40 - suffix.length)}${suffix}`.replace(/^-+|-+$/g, "");
    if (slug.length < 3) slug = `${slug}-me`.slice(0, 40);
    if (SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug)) out.push(slug);
  }
  return out;
}
