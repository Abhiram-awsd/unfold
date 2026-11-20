/** Root domain that serves the app, e.g. "unfold.site" or "localhost:3000". */
export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000").toLowerCase();

const isLocal = ROOT_DOMAIN.startsWith("localhost") || ROOT_DOMAIN.startsWith("127.0.0.1");

/** Public address of a portfolio, e.g. https://maya.unfold.site */
export function portfolioUrl(slug: string): string {
  return `${isLocal ? "http" : "https"}://${slug}.${ROOT_DOMAIN}`;
}

/** Display form without the protocol, e.g. maya.unfold.site */
export function portfolioHost(slug: string): string {
  return `${slug}.${ROOT_DOMAIN}`;
}

/** Slugs that would collide with app routes or common infrastructure hostnames. */
export const RESERVED_SLUGS = new Set([
  "www", "app", "api", "admin", "dashboard", "mail", "blog", "help", "docs", "status", "assets", "static",
]);

/** 3–40 characters: lowercase letters, digits and inner hyphens. Mirrors the database check. */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}
