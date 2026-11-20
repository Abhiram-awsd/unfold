import { promises as fs } from "node:fs";
import path from "node:path";
import { dayKey } from "@/lib/analytics";
import { DEMO_USER_ID } from "@/lib/demo";
import type { Message, Portfolio, Project } from "@/lib/supabase/types";
import { mergedPortfolioFields, newPortfolioFields, newProjects, slugCandidates } from "./merge";
import { downloadName, previewOf } from "./public";
import { fail, ok, type ImageTarget, type Store } from "./types";

/** Demo data lives in one git-ignored JSON file in the project folder; uploaded files in a git-ignored folder. */
const FILE = path.join(process.cwd(), ".unfold-demo.json");
export const DEMO_MEDIA_DIR = path.join(process.cwd(), ".unfold-demo-media");
const MEDIA_URL = "/api/media/";

type DemoData = {
  portfolio: Portfolio | null;
  projects: Project[];
  views: Array<{ at: string; ref: string | null }>;
  clicks: Array<{ at: string; target: string }>;
  messages: Message[];
  resumes: Array<{ file_name: string; created_at: string; file?: string | null }>;
};

const empty = (): DemoData => ({ portfolio: null, projects: [], views: [], clicks: [], messages: [], resumes: [] });

/** Fills fields added after a demo file was first written, so old files keep working. */
function upgrade(d: DemoData): DemoData {
  d.views = (d.views as unknown[]).map(v => (typeof v === "string" ? { at: v, ref: null } : (v as DemoData["views"][number])));
  if (d.portfolio) {
    const stored: Partial<Portfolio> = d.portfolio;
    d.portfolio = { avatar_url: null, theme_options: {}, contact_enabled: true, resume_url: null, links: [], education: [], ...stored } as Portfolio;
  }
  d.projects = d.projects.map((p: Partial<Project>) => ({ image_url: null, link_url: null, repo: null, stars: null, language: null, ...p }) as Project);
  return d;
}

async function read(): Promise<DemoData> {
  try {
    return upgrade({ ...empty(), ...(JSON.parse(await fs.readFile(FILE, "utf8")) as Partial<DemoData>) });
  } catch {
    return empty();
  }
}

// Writes are queued so two quick actions can't interleave and lose data.
let queue: Promise<unknown> = Promise.resolve();
function update<T>(fn: (d: DemoData) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const d = await read();
    const out = await fn(d);
    const tmp = `${FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(d, null, 2));
    await fs.rename(tmp, FILE);
    return out;
  });
  queue = run.catch(() => undefined);
  return run;
}

const now = () => new Date().toISOString();
const ordered = (list: Project[]) => [...list].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));

/* ---------- media files ---------- */

async function saveMedia(name: string, bytes: Buffer): Promise<string> {
  await fs.mkdir(DEMO_MEDIA_DIR, { recursive: true });
  await fs.writeFile(path.join(DEMO_MEDIA_DIR, name), bytes);
  return `${MEDIA_URL}${name}`;
}

/** Deletes a file this store created (ignores anything else, and files already gone). */
async function removeMedia(url: string | null | undefined): Promise<void> {
  if (!url?.startsWith(MEDIA_URL)) return;
  const name = path.basename(url.slice(MEDIA_URL.length).split("?")[0]);
  await fs.rm(path.join(DEMO_MEDIA_DIR, name), { force: true }).catch(() => {});
}

/** Copies the latest uploaded resume to a public file; returns its URL or null if there is no file. */
async function publishResume(d: DemoData): Promise<string | null> {
  const latest = d.resumes.at(-1);
  if (!latest?.file || !d.portfolio) return null;
  const name = path.basename(latest.file);
  const ext = path.extname(name).slice(1);
  const bytes = await fs.readFile(path.join(DEMO_MEDIA_DIR, name)).catch(() => null);
  if (!bytes) return null;
  const url = await saveMedia(`resume-${crypto.randomUUID()}.${ext}`, bytes);
  return `${url}?download=${encodeURIComponent(downloadName(d.portfolio.name, ext))}`;
}

/** Local, single-user store for designing without Clerk or Supabase. */
export const demoStore: Store = {
  async loadOwner() {
    const d = await read();
    if (!d.portfolio) return ok(null);
    const since = Date.now() - 30 * 86_400_000;
    return ok({
      portfolio: d.portfolio,
      projects: ordered(d.projects),
      views30: d.views.filter(v => Date.parse(v.at) >= since).length,
      latestResumeAt: d.resumes.at(-1)?.created_at ?? null,
      hasResumeFile: !!d.resumes.at(-1)?.file,
      unread: d.messages.filter(m => !m.read_at).length,
    });
  },

  async updatePortfolio(_userId, edit) {
    return update(d => {
      if (!d.portfolio) return fail("Upload a resume first.");
      d.portfolio = { ...d.portfolio, ...edit, updated_at: now() };
      return ok(null);
    });
  },

  async setPublished(_userId, published) {
    return update(d => {
      if (d.portfolio) d.portfolio.published = published;
      return ok(null);
    });
  },

  async updateProject(_userId, id, edit) {
    return update(d => {
      const p = d.projects.find(x => x.id === id);
      if (!p) return fail("That project no longer exists.");
      Object.assign(p, edit);
      return ok(null);
    });
  },

  async deleteProject(_userId, id) {
    return update(async d => {
      const gone = d.projects.find(x => x.id === id);
      d.projects = d.projects.filter(x => x.id !== id);
      await removeMedia(gone?.image_url);
      return ok(null);
    });
  },

  async moveProject(_userId, id, dir) {
    return update(d => {
      const list = ordered(d.projects);
      const i = list.findIndex(p => p.id === id), j = i + dir;
      if (i >= 0 && j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
      list.forEach((p, position) => (p.position = position));
      d.projects = list;
      return ok(null);
    });
  },

  async addProjects(_userId, drafts) {
    return update(d => {
      if (!d.portfolio) return fail("Upload a resume first.");
      const portfolioId = d.portfolio.id;
      const repos = new Set(d.projects.map(p => p.repo?.toLowerCase()).filter(Boolean));
      const fresh = drafts.filter(p => !p.repo || !repos.has(p.repo.toLowerCase()));
      const start = d.projects.reduce((max, p) => Math.max(max, p.position + 1), 0);
      const ts = now();
      d.projects.push(
        ...fresh.map((p, i) => ({ id: crypto.randomUUID(), portfolio_id: portfolioId, user_id: DEMO_USER_ID, position: start + i, approved: false, image_url: null, created_at: ts, ...p })),
      );
      return ok({ added: fresh.length });
    });
  },

  async importResume(_userId, { file, ext, fileName, parsed }) {
    return update(async d => {
      const ts = now();
      // The demo sample arrives without a file; real uploads are kept so they can be offered for download.
      const stored = file.length ? await saveMedia(`upload-${crypto.randomUUID()}.${ext}`, file) : null;
      d.resumes.push({ file_name: fileName, created_at: ts, file: stored });
      if (!d.portfolio) {
        d.portfolio = {
          id: crypto.randomUUID(),
          user_id: DEMO_USER_ID,
          slug: slugCandidates(parsed.name)[0] ?? "portfolio",
          custom_domain: null,
          theme: "minimal",
          published: false,
          show_badge: true,
          show_email: true,
          avatar_url: null,
          theme_options: {},
          contact_enabled: true,
          resume_url: null,
          created_at: ts,
          updated_at: ts,
          ...newPortfolioFields(parsed),
        };
      } else {
        d.portfolio = { ...d.portfolio, ...mergedPortfolioFields(d.portfolio, parsed), updated_at: ts };
        // Downloads on: swap in the new file so visitors always get the latest resume.
        if (d.portfolio.resume_url && stored) {
          const old = d.portfolio.resume_url;
          d.portfolio.resume_url = (await publishResume(d)) ?? old;
          if (d.portfolio.resume_url !== old) await removeMedia(old);
        }
      }
      const portfolioId = d.portfolio.id;
      const start = d.projects.reduce((max, p) => Math.max(max, p.position + 1), 0);
      const fresh = newProjects(parsed, d.projects.map(p => p.title));
      d.projects.push(
        ...fresh.map((p, i) => ({
          id: crypto.randomUUID(), portfolio_id: portfolioId, user_id: DEMO_USER_ID, position: start + i, approved: false, created_at: ts,
          image_url: null, link_url: null, repo: null, stars: null, language: null, ...p,
        })),
      );
      return ok({ added: fresh.length });
    });
  },

  async setImage(_userId, target: ImageTarget, file) {
    return update(async d => {
      if (!d.portfolio) return fail("Upload a resume first.");
      const project = target.kind === "project" ? d.projects.find(p => p.id === target.id) : null;
      if (target.kind === "project" && !project) return fail("That project no longer exists.");
      const old = target.kind === "avatar" ? d.portfolio.avatar_url : project!.image_url;
      const url = file ? await saveMedia(`${target.kind}-${crypto.randomUUID()}.${file.ext}`, file.bytes) : null;
      if (target.kind === "avatar") Object.assign(d.portfolio, { avatar_url: url, updated_at: now() });
      else project!.image_url = url;
      await removeMedia(old);
      return ok({ url });
    });
  },

  async setResumeDownload(_userId, on) {
    return update(async d => {
      if (!d.portfolio) return fail("Upload a resume first.");
      const old = d.portfolio.resume_url;
      if (!on) {
        d.portfolio.resume_url = null;
        await removeMedia(old);
        return ok({ url: null });
      }
      const url = await publishResume(d);
      if (!url) return fail("Upload your resume file first. The sample resume has no file to download.");
      d.portfolio.resume_url = url;
      await removeMedia(old);
      return ok({ url });
    });
  },

  async getPublicPortfolio(site) {
    const d = await read();
    const p = d.portfolio;
    const key = site.toLowerCase();
    if (!p || !p.published || (p.slug !== key && p.custom_domain !== key)) return null;
    return toPublic(p, d.projects);
  },

  async recordView(_portfolioId, _path, referrer) {
    await update(d => {
      if (!d.portfolio?.published) return;
      d.views.push({ at: now(), ref: referrer });
      if (d.views.length > 5000) d.views = d.views.slice(-5000);
    });
  },

  async recordClick(_portfolioId, target) {
    await update(d => {
      if (!d.portfolio?.published) return;
      d.clicks.push({ at: now(), target });
      if (d.clicks.length > 5000) d.clicks = d.clicks.slice(-5000);
    });
  },

  async sendMessage(portfolioId, { name, email, message }, senderHash) {
    return update(d => {
      const p = d.portfolio;
      if (!p || p.id !== portfolioId || !p.published || !p.contact_enabled) return fail("This site isn’t taking messages right now.", null, "closed");
      const [n, e, m] = [name.trim(), email.trim(), message.trim()];
      if (!n || n.length > 80 || e.length < 3 || e.length > 200 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) || !m || m.length > 3000) {
        return fail("Check your name, email and message.", null, "invalid");
      }
      const hour = Date.now() - 3_600_000, day = Date.now() - 86_400_000;
      const recent = d.messages.filter(x => Date.parse(x.created_at) > hour && x.sender_hash === senderHash).length;
      const today = d.messages.filter(x => Date.parse(x.created_at) > day).length;
      if (recent >= 5 || today >= 50) return fail("Too many messages. Try again later.", null, "limited");
      d.messages.unshift({
        id: crypto.randomUUID(), portfolio_id: p.id, user_id: DEMO_USER_ID, sender_name: n, sender_email: e, body: m,
        sender_hash: senderHash, read_at: null, created_at: now(),
      });
      return ok(null);
    });
  },

  async listMessages() {
    const d = await read();
    return ok([...d.messages].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },

  async markMessage(_userId, id, read) {
    return update(d => {
      const m = d.messages.find(x => x.id === id);
      if (m) m.read_at = read ? m.read_at ?? now() : null;
      return ok(null);
    });
  },

  async deleteMessage(_userId, id) {
    return update(d => {
      d.messages = d.messages.filter(x => x.id !== id);
      return ok(null);
    });
  },

  async loadStats(_userId, days, timeZone) {
    const d = await read();
    const span = Math.max(1, Math.min(days, 365));
    const from = Date.now() - span * 86_400_000, before = from - span * 86_400_000;
    const views = d.views.filter(v => Date.parse(v.at) >= from);
    const daily = new Map<string, number>();
    const refs = new Map<string, number>();
    for (const v of views) {
      const key = dayKey(new Date(v.at), timeZone);
      daily.set(key, (daily.get(key) ?? 0) + 1);
      refs.set(v.ref ?? "", (refs.get(v.ref ?? "") ?? 0) + 1);
    }
    const clicks = new Map<string, number>();
    for (const c of d.clicks) if (Date.parse(c.at) >= from) clicks.set(c.target, (clicks.get(c.target) ?? 0) + 1);
    const top = <T,>(m: Map<string, number>, n: number, f: (k: string, v: number) => T) =>
      [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([k, v]) => f(k, v));
    return ok({
      days: span,
      total: views.length,
      previous: d.views.filter(v => { const t = Date.parse(v.at); return t >= before && t < from; }).length,
      daily: [...daily].sort((a, b) => a[0].localeCompare(b[0])).map(([day, n]) => ({ day, views: n })),
      referrers: top(refs, 10, (source, n) => ({ source, views: n })),
      clicks: top(clicks, 50, (target, n) => ({ target, clicks: n })),
    });
  },
  async uploadsSince(_userId, sinceIso) {
    return (await read()).resumes.filter(r => r.created_at >= sinceIso).length;
  },

  async setCustomDomain(_userId, domain) {
    return update(d => {
      if (!d.portfolio) return fail("Upload a resume first.");
      d.portfolio.custom_domain = domain;
      return ok(null);
    });
  },

  async deleteAccount() {
    await resetDemo();
    return ok(null);
  },

  async ownerContact() {
    return null; // demo mode sends no email
  },

  async adminOverview() {
    const d = await read();
    const day = new Date(Date.now() - 86_400_000).toISOString();
    const p = d.portfolio;
    return ok({
      users: p ? 1 : 0, portfolios: p ? 1 : 0, published: p?.published ? 1 : 0,
      uploads24h: d.resumes.filter(r => r.created_at >= day).length, messages: d.messages.length,
      recent: p ? [{ id: p.id, slug: p.slug, name: p.name, published: p.published, custom_domain: p.custom_domain, created_at: p.created_at }] : [],
    });
  },

  async adminUnpublish() {
    return update(d => {
      if (d.portfolio) d.portfolio.published = false;
      return ok(null);
    });
  },
};

/** Same shape and privacy rules as get_public_portfolio(). */
const toPublic = previewOf;

/** Clears all demo data and files (dashboard "Start over" in demo mode). */
export async function resetDemo(): Promise<void> {
  await update(async d => {
    Object.assign(d, empty());
    await fs.rm(DEMO_MEDIA_DIR, { recursive: true, force: true }).catch(() => {});
  });
}
