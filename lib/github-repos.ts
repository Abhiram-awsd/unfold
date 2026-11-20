import type { ProjectDraft } from "@/lib/data/types";

/**
 * Public GitHub repositories as project drafts. Uses the REST API; set GITHUB_TOKEN to lift the
 * unauthenticated limit of 60 requests an hour per server IP. Everything imported is a draft.
 */

const API = (process.env.GITHUB_API_URL ?? "https://api.github.com").replace(/\/$/, "");
export const GITHUB_USER = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
export const MAX_IMPORT = 10;

export type Repo = {
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  language: string | null;
  url: string;
  homepage: string | null;
  fork: boolean;
  archived: boolean;
  created: string;
  pushed: string;
};

export class GitHubError extends Error {}

function headers(accept = "application/vnd.github+json"): HeadersInit {
  const h: Record<string, string> = { accept, "x-github-api-version": "2022-11-28", "user-agent": "unfold-portfolio" };
  if (process.env.GITHUB_TOKEN) h.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function call(path: string, accept?: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { headers: headers(accept), signal: AbortSignal.timeout(8000), cache: "no-store" });
  } catch (e) {
    throw new GitHubError(e instanceof Error && e.name === "TimeoutError" ? "GitHub took too long to answer. Try again." : "We couldn’t reach GitHub. Try again.");
  }
  if (res.status === 403 || res.status === 429) {
    throw new GitHubError(
      res.headers.get("x-ratelimit-remaining") === "0" || res.status === 429
        ? "GitHub’s hourly limit was reached. Try again later."
        : "GitHub refused the request. Try again later.",
    );
  }
  return res;
}

type ApiRepo = {
  name: string; full_name: string; description: string | null; stargazers_count: number; language: string | null;
  html_url: string; homepage: string | null; fork: boolean; archived: boolean; created_at: string; pushed_at: string;
  owner?: { login?: string };
};

function toRepo(r: ApiRepo): Repo {
  return {
    name: r.name,
    fullName: r.full_name,
    description: r.description?.trim() || null,
    stars: Math.max(0, Number(r.stargazers_count) || 0),
    language: r.language?.slice(0, 40) || null,
    url: r.html_url,
    homepage: r.homepage?.trim() || null,
    fork: !!r.fork,
    archived: !!r.archived,
    created: r.created_at,
    pushed: r.pushed_at,
  };
}

/** A user's public repositories, most-starred first (forks last). */
export async function listRepos(user: string): Promise<Repo[]> {
  if (!GITHUB_USER.test(user)) throw new GitHubError("That doesn’t look like a GitHub username.");
  const res = await call(`/users/${encodeURIComponent(user)}/repos?per_page=100&sort=pushed&type=owner`);
  if (res.status === 404) throw new GitHubError(`There’s no GitHub account called “${user}”.`);
  if (!res.ok) throw new GitHubError("GitHub returned an error. Try again.");
  const list = ((await res.json()) as ApiRepo[]).map(toRepo);
  return list.sort((a, b) => Number(a.fork) - Number(b.fork) || b.stars - a.stars || b.pushed.localeCompare(a.pushed));
}

async function getRepo(fullName: string): Promise<Repo | null> {
  const res = await call(`/repos/${fullName.split("/").map(encodeURIComponent).join("/")}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new GitHubError("GitHub returned an error. Try again.");
  return toRepo((await res.json()) as ApiRepo);
}

async function getReadme(fullName: string): Promise<string> {
  const res = await call(`/repos/${fullName.split("/").map(encodeURIComponent).join("/")}/readme`, "application/vnd.github.raw+json");
  if (!res.ok) return ""; // no README is fine
  return (await res.text()).slice(0, 100_000);
}

/** Plain-text opening of a README: no code, images, badges, tables, HTML or Markdown syntax. */
export function readmeExcerpt(md: string, max = 1200): string {
  const text = md
    .replace(/\r\n?/g, "\n")
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[!\[[^\]]*]\([^)]*\)]\([^)]*\)/g, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[\s*]\([^)]*\)/g, "")
    .replace(/^\s*\[[^\]]+]:\s*\S+.*$/gm, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p =>
      p
        .split("\n")
        .filter(l => !/^\s*(#{1,6}\s|[|>]|[-*_]{3,}\s*$)/.test(l))
        .map(l => l.replace(/^\s*(?:[-*+]|\d+\.)\s+/, ""))
        .join(" "),
    )
    .map(p => p.replace(/[*_`~]+/g, "").replace(/\s+/g, " ").trim())
    .filter(p => p.length >= 40 && /[a-z]/i.test(p));
  let out = "";
  for (const p of paragraphs) {
    if (out && out.length + p.length + 2 > max) break;
    out = out ? `${out}\n\n${p}` : p;
    if (out.length >= max * 0.6) break;
  }
  if (out.length > max) {
    const cut = out.slice(0, max);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
    out = end > max * 0.5 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, "")}…`;
  }
  return out;
}

function firstSentence(text: string, max = 240): string {
  const m = text.match(/^.+?[.!?](?=\s|$)/);
  const s = (m ? m[0] : text).trim();
  return s.length > max ? `${s.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : s;
}

function httpsOrNull(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Builds drafts for the chosen repositories of `user` (at most MAX_IMPORT). Unknown names are skipped. */
export async function repoDrafts(user: string, names: string[]): Promise<ProjectDraft[]> {
  if (!GITHUB_USER.test(user)) throw new GitHubError("That doesn’t look like a GitHub username.");
  const wanted = Array.from(new Set(names.filter(n => /^[A-Za-z0-9_.-]{1,100}$/.test(n)))).slice(0, MAX_IMPORT);
  const drafts: ProjectDraft[] = [];
  for (const name of wanted) {
    const repo = await getRepo(`${user}/${name}`);
    if (!repo) continue;
    const excerpt = readmeExcerpt(await getReadme(repo.fullName));
    const from = repo.created.slice(0, 4), to = repo.pushed.slice(0, 4);
    drafts.push({
      title: repo.name.slice(0, 80),
      organization: null,
      period: from && to ? (from === to ? from : `${from}–${to}`) : null,
      summary: firstSentence(repo.description ?? excerpt),
      story: excerpt.slice(0, 2000),
      link_url: httpsOrNull(repo.homepage) ?? repo.url,
      repo: repo.fullName,
      stars: repo.stars,
      language: repo.language,
    });
  }
  return drafts;
}
