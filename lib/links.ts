import type { Education, PortfolioLink } from "@/lib/supabase/types";

/** Adds https:// where missing and drops anything that still isn't a valid web or mail link. */
export function normalizeUrl(raw: string): string | null {
  let url = raw.trim();
  if (!url) return null;
  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(url)) url = `mailto:${url}`;
  else if (!/^(https?:|mailto:)/i.test(url)) url = `https://${url.replace(/^\/+/, "")}`;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" || u.protocol === "mailto:" ? u.toString() : null;
  } catch {
    return null;
  }
}

const KNOWN: Array<[RegExp, string]> = [
  [/linkedin\.com/i, "LinkedIn"],
  [/github\.com/i, "GitHub"],
  [/gitlab\.com/i, "GitLab"],
  [/dribbble\.com/i, "Dribbble"],
  [/behance\.net/i, "Behance"],
  [/(^|\/\/|\.)(twitter|x)\.com/i, "X"],
  [/medium\.com/i, "Medium"],
  [/youtube\.com|youtu\.be/i, "YouTube"],
  [/instagram\.com/i, "Instagram"],
  [/figma\.com/i, "Figma"],
  [/kaggle\.com/i, "Kaggle"],
  [/stackoverflow\.com/i, "Stack Overflow"],
];

/** A readable label for a URL: "GitHub" for github.com, otherwise the bare domain. */
export function labelForUrl(url: string): string {
  for (const [re, label] of KNOWN) if (re.test(url)) return label;
  if (url.startsWith("mailto:")) return "Email";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}

/** "GitHub | https://github.com/me" or just "github.com/me", one per line. */
export function parseLinkLines(text: string): PortfolioLink[] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [a, b] = line.includes("|") ? line.split("|").map(s => s.trim()) : ["", line];
      const url = normalizeUrl(b ?? "");
      return url ? { label: a || labelForUrl(url), url } : null;
    })
    .filter((l): l is PortfolioLink => !!l)
    .slice(0, 8);
}

export const linkLines = (links: PortfolioLink[]) => links.map(l => `${l.label} | ${l.url}`).join("\n");

/** "School | Degree | Years", one per line; degree and years are optional. */
export function parseEducationLines(text: string): Education[] {
  return text
    .split(/\r?\n/)
    .map(line => line.split("|").map(s => s.trim()))
    .filter(([school]) => !!school)
    .map(([school, degree, period]) => ({ school, degree: degree || null, period: period || null }))
    .slice(0, 6);
}

export const educationLines = (list: Education[]) =>
  list.map(e => [e.school, e.degree ?? "", e.period ?? ""].join(" | ").replace(/( \| )+$/, "")).join("\n");

/** The GitHub username from a portfolio's links, if there is one. */
export function githubUser(links: PortfolioLink[]): string | null {
  for (const l of links) {
    const m = l.url.match(/github\.com\/([A-Za-z0-9-]{1,39})(?:[/?#]|$)/i);
    if (m && !["orgs", "sponsors", "about", "features"].includes(m[1].toLowerCase())) return m[1];
  }
  return null;
}
