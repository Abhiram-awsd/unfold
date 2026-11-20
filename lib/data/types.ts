import type { ResumeData, ResumeExt } from "@/lib/parse-resume";
import type { Education, Message, Portfolio, PortfolioLink, Project, PublicPortfolio, StoredThemeOptions, Theme } from "@/lib/supabase/types";

export type DataError = { code: "taken" | "failed" | "closed" | "invalid" | "limited"; message: string; cause?: unknown };
export type Result<T> = { ok: true; value: T } | { ok: false; error: DataError };

export const ok = <T,>(value: T): Result<T> => ({ ok: true, value });
export const fail = (message: string, cause?: unknown, code: DataError["code"] = "failed"): Result<never> => ({
  ok: false,
  error: { code, message, cause },
});

/** Everything the dashboard shows for the signed-in owner. */
export type OwnerView = {
  portfolio: Portfolio;
  projects: Project[];
  views30: number;
  latestResumeAt: string | null;
  /** The latest upload has a file that visitors could download (the demo sample has none). */
  hasResumeFile: boolean;
  unread: number;
};

/** Portfolio fields the owner can edit. Every update sends only the fields it changes. */
export type PortfolioEdit = {
  name: string;
  headline: string;
  bio: string;
  location: string | null;
  email: string | null;
  show_email: boolean;
  skills: string[];
  links: PortfolioLink[];
  education: Education[];
  slug: string;
  theme: Theme;
  theme_options: StoredThemeOptions;
  contact_enabled: boolean;
};

export type ProjectEdit = Pick<Project, "title" | "organization" | "period" | "summary" | "story" | "approved" | "link_url">;

/** A new project draft from an import (always a draft until the owner approves it). */
export type ProjectDraft = Pick<Project, "title" | "organization" | "period" | "summary" | "story" | "link_url" | "repo" | "stars" | "language">;

export type ResumeImport = { file: Buffer; ext: ResumeExt; fileName: string; parsed: ResumeData };

export type ImageExt = "png" | "jpg" | "webp" | "gif";
export type ImageFile = { bytes: Buffer; ext: ImageExt; type: string };
export type ImageTarget = { kind: "avatar" } | { kind: "project"; id: string };

export type ContactMessage = { name: string; email: string; message: string };

/** Analytics for one owner over a window of days. */
export type Stats = {
  days: number;
  total: number;
  previous: number;
  daily: Array<{ day: string; views: number }>;
  referrers: Array<{ source: string; views: number }>;
  clicks: Array<{ target: string; clicks: number }>;
};

/** One storage backend: Supabase in real use, a local JSON file in demo mode. */
export interface Store {
  loadOwner(userId: string): Promise<Result<OwnerView | null>>;
  updatePortfolio(userId: string, edit: Partial<PortfolioEdit>): Promise<Result<null>>;
  setPublished(userId: string, published: boolean): Promise<Result<null>>;
  updateProject(userId: string, id: string, edit: Partial<ProjectEdit>): Promise<Result<null>>;
  deleteProject(userId: string, id: string): Promise<Result<null>>;
  moveProject(userId: string, id: string, dir: -1 | 1): Promise<Result<null>>;
  addProjects(userId: string, drafts: ProjectDraft[]): Promise<Result<{ added: number }>>;
  importResume(userId: string, input: ResumeImport): Promise<Result<{ added: number }>>;
  /** Saves (or with null, removes) the avatar or a project image; returns the new public URL. */
  setImage(userId: string, target: ImageTarget, file: ImageFile | null): Promise<Result<{ url: string | null }>>;
  /** Publishes (or removes) a downloadable copy of the latest uploaded resume. */
  setResumeDownload(userId: string, on: boolean): Promise<Result<{ url: string | null }>>;
  getPublicPortfolio(site: string): Promise<PublicPortfolio | null>;
  recordView(portfolioId: string, path: string, referrer: string | null): Promise<void>;
  recordClick(portfolioId: string, target: string): Promise<void>;
  sendMessage(portfolioId: string, message: ContactMessage, senderHash: string): Promise<Result<null>>;
  listMessages(userId: string): Promise<Result<Message[]>>;
  markMessage(userId: string, id: string, read: boolean): Promise<Result<null>>;
  deleteMessage(userId: string, id: string): Promise<Result<null>>;
  loadStats(userId: string, days: number, timeZone: string): Promise<Result<Stats>>;
  /** Resume uploads since an instant (for rate limits). */
  uploadsSince(userId: string, sinceIso: string): Promise<number>;
  /** Sets or clears the custom domain (bare lowercase hostname). */
  setCustomDomain(userId: string, domain: string | null): Promise<Result<null>>;
  /** Deletes every row and file the user owns. Cannot be undone. */
  deleteAccount(userId: string): Promise<Result<null>>;
  /** Who to notify about a portfolio (server-side only; never sent to visitors). */
  ownerContact(portfolioId: string): Promise<{ email: string; name: string } | null>;
  adminOverview(): Promise<Result<AdminOverview>>;
  adminUnpublish(portfolioId: string): Promise<Result<null>>;
}

export type AdminOverview = {
  users: number; portfolios: number; published: number; uploads24h: number; messages: number;
  recent: Array<{ id: string; slug: string; name: string; published: boolean; custom_domain: string | null; created_at: string }>;
};
