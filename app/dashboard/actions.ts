"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { currentUserId, store, type DataError } from "@/lib/data";
import { resetDemo } from "@/lib/data/demo-store";
import { DEMO, DEMO_USER_ID } from "@/lib/demo";
import { attachDomain, cleanDomain, detachDomain } from "@/lib/domains";
import { skillList, webUrl } from "@/lib/edit";
import { GitHubError, GITHUB_USER, listRepos, MAX_IMPORT, repoDrafts, type Repo } from "@/lib/github-repos";
import { parseEducationLines, parseLinkLines } from "@/lib/links";
import { SAMPLE_RESUME } from "@/lib/sample-resume";
import { RESERVED_SLUGS, SLUG_PATTERN } from "@/lib/site";
import { TEMPLATE_IDS } from "@/lib/templates";
import { FONT_IDS, HEX, MODE_IDS } from "@/lib/theme";

export type ActionState = { ok: boolean; message: string; at: number } | null;

const result = (ok: boolean, message: string): ActionState => ({ ok, message, at: Date.now() });

async function userId(): Promise<string> {
  const id = await currentUserId();
  if (!id) throw new Error("You’re signed out. Sign in again to save changes.");
  return id;
}

function logged(error: DataError): string {
  if (error.cause) console.error(`[dashboard] ${error.message}`, error.cause);
  return error.message;
}

/** Every page that shows portfolio data. */
function refresh() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/editor");
}

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`);

/** Accent: "" (template default), a preset hex, or "custom" with the colour picker's value. */
function accentFrom(form: FormData): string | null {
  const choice = String(form.get("accent") ?? "");
  const value = choice === "custom" ? String(form.get("accent_custom") ?? "") : choice;
  return HEX.test(value) ? value.toLowerCase() : null;
}

const Details = z.object({
  name: text(80).min(1, "Add your name"),
  headline: text(140),
  bio: text(1200),
  location: text(80),
  email: z.union([z.literal(""), z.email("Enter a valid email address")]),
  show_email: z.boolean(),
  skills: z.string().max(1000),
  links: z.string().max(2000),
  education: z.string().max(2000),
  slug: z.string().trim().toLowerCase(),
  theme: z.enum(TEMPLATE_IDS),
  font: z.enum(FONT_IDS),
  mode: z.enum(MODE_IDS),
});

export async function saveDetails(_prev: ActionState, form: FormData): Promise<ActionState> {
  const input = Details.safeParse({
    name: form.get("name") ?? "",
    headline: form.get("headline") ?? "",
    bio: form.get("bio") ?? "",
    location: form.get("location") ?? "",
    email: String(form.get("email") ?? "").trim(),
    show_email: form.get("show_email") === "on",
    skills: form.get("skills") ?? "",
    links: form.get("links") ?? "",
    education: form.get("education") ?? "",
    slug: form.get("slug") ?? "",
    theme: form.get("theme") ?? "minimal",
    font: form.get("font") ?? "default",
    mode: form.get("mode") ?? "default",
  });
  if (!input.success) return result(false, input.error.issues[0]?.message ?? "Check the highlighted fields.");
  const d = input.data;

  if (!SLUG_PATTERN.test(d.slug)) {
    return result(false, "Your address needs 3–40 lowercase letters, numbers or hyphens, and can’t start or end with a hyphen.");
  }
  if (RESERVED_SLUGS.has(d.slug)) return result(false, `“${d.slug}” is reserved. Try another address.`);

  const res = await store.updatePortfolio(await userId(), {
    name: d.name,
    headline: d.headline,
    bio: d.bio,
    location: d.location || null,
    email: d.email || null,
    show_email: d.show_email,
    skills: skillList(d.skills),
    links: parseLinkLines(d.links),
    education: parseEducationLines(d.education),
    slug: d.slug,
    theme: d.theme,
    theme_options: { accent: accentFrom(form), font: d.font, mode: d.mode },
  });
  if (!res.ok) return result(false, logged(res.error));
  refresh();
  return result(true, "Saved");
}

export async function setPublished(form: FormData): Promise<void> {
  const res = await store.setPublished(await userId(), form.get("published") === "true");
  if (!res.ok) logged(res.error);
  refresh();
}

const ProjectInput = z.object({
  id: z.string().min(1),
  title: text(80).min(1, "Give the project a title"),
  organization: text(80),
  period: text(40),
  summary: text(240),
  story: text(2000),
  link_url: z.string().trim().max(300),
  approved: z.boolean(),
});

export async function saveProject(_prev: ActionState, form: FormData): Promise<ActionState> {
  const input = ProjectInput.safeParse({
    id: form.get("id"),
    title: form.get("title") ?? "",
    organization: form.get("organization") ?? "",
    period: form.get("period") ?? "",
    summary: form.get("summary") ?? "",
    story: form.get("story") ?? "",
    link_url: form.get("link_url") ?? "",
    approved: form.get("approved") === "on",
  });
  if (!input.success) return result(false, input.error.issues[0]?.message ?? "Check the project fields.");
  const { id, link_url, ...p } = input.data;
  const link = link_url ? webUrl(link_url) : null;
  if (link_url && !link) return result(false, "The project link needs to be a web address, like example.com.");
  const res = await store.updateProject(await userId(), id, {
    ...p,
    organization: p.organization || null,
    period: p.period || null,
    link_url: link,
  });
  if (!res.ok) return result(false, logged(res.error));
  refresh();
  return result(true, "Saved");
}

export async function deleteProject(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  if (!id) return;
  const res = await store.deleteProject(await userId(), id);
  if (!res.ok) logged(res.error);
  refresh();
}

export async function moveProject(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  if (!id) return;
  const res = await store.moveProject(await userId(), id, form.get("dir") === "up" ? -1 : 1);
  if (!res.ok) logged(res.error);
  refresh();
}

/* ---------- on your site: contact form and resume download ---------- */

export async function setContactForm(on: boolean): Promise<ActionState> {
  const res = await store.updatePortfolio(await userId(), { contact_enabled: on });
  if (!res.ok) return result(false, logged(res.error));
  refresh();
  return result(true, on ? "Contact form is on" : "Contact form is off");
}

export async function setResumeDownload(on: boolean): Promise<ActionState> {
  const res = await store.setResumeDownload(await userId(), on);
  if (!res.ok) return result(false, logged(res.error));
  refresh();
  return result(true, on ? "Download is on" : "Download is off");
}

/* ---------- GitHub import ---------- */

export type RepoList = { ok: true; user: string; repos: Repo[] } | { ok: false; message: string };

export async function findGithubRepos(user: string): Promise<RepoList> {
  await userId();
  const name = String(user).trim().replace(/^@/, "").replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "").split(/[/?#]/)[0];
  if (!GITHUB_USER.test(name)) return { ok: false, message: "Enter a GitHub username, like octocat." };
  try {
    const repos = await listRepos(name);
    if (!repos.length) return { ok: false, message: `${name} has no public repositories yet.` };
    return { ok: true, user: name, repos };
  } catch (e) {
    if (!(e instanceof GitHubError)) console.error("[github]", e);
    return { ok: false, message: e instanceof GitHubError ? e.message : "We couldn’t load those repositories. Try again." };
  }
}

export async function importGithubRepos(user: string, names: string[]): Promise<ActionState> {
  const id = await userId();
  if (!GITHUB_USER.test(String(user))) return result(false, "Enter a GitHub username first.");
  if (!Array.isArray(names) || !names.length) return result(false, "Pick at least one repository.");
  if (names.length > MAX_IMPORT) return result(false, `Pick up to ${MAX_IMPORT} repositories at a time.`);
  try {
    const drafts = await repoDrafts(user, names.map(String));
    if (!drafts.length) return result(false, "Those repositories couldn’t be found. Refresh the list and try again.");
    const res = await store.addProjects(id, drafts);
    if (!res.ok) return result(false, logged(res.error));
    refresh();
    const n = res.value.added;
    return result(true, n ? `Added ${n} draft${n === 1 ? "" : "s"}. Review and approve ${n === 1 ? "it" : "them"} below.` : "Those repositories are already in your projects.");
  } catch (e) {
    if (!(e instanceof GitHubError)) console.error("[github]", e);
    return result(false, e instanceof GitHubError ? e.message : "We couldn’t import those repositories. Try again.");
  }
}

/* ---------- inbox ---------- */

export async function markMessage(id: string, read: boolean): Promise<void> {
  const res = await store.markMessage(await userId(), String(id), !!read);
  if (!res.ok) logged(res.error);
  revalidatePath("/dashboard", "layout");
}

export async function deleteMessage(id: string): Promise<void> {
  const res = await store.deleteMessage(await userId(), String(id));
  if (!res.ok) logged(res.error);
  revalidatePath("/dashboard", "layout");
}

/* ---------- settings: custom domain and account deletion ---------- */

export async function setCustomDomain(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = await userId();
  const owner = await store.loadOwner(id);
  if (!owner.ok || !owner.value) return result(false, "Upload a resume first.");
  const current = owner.value.portfolio.custom_domain;
  const raw = String(form.get("domain") ?? "").trim();
  const domain = raw ? cleanDomain(raw) : null;
  if (raw && !domain) return result(false, "Enter a domain you own, like yourname.com or www.yourname.com.");
  if (domain === current) return result(true, domain ? "Already connected" : "No domain connected");

  if (domain) {
    const problem = await attachDomain(domain);
    if (problem) return result(false, problem);
  }
  const res = await store.setCustomDomain(id, domain);
  if (!res.ok) {
    if (domain) await detachDomain(domain);
    return result(false, logged(res.error));
  }
  if (current) await detachDomain(current);
  refresh();
  return result(true, domain ? "Domain saved. Add the DNS record below." : "Domain removed");
}

export async function deleteAccount(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = await userId();
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") return result(false, "Type DELETE to confirm.");
  const owner = await store.loadOwner(id);
  const domain = owner.ok ? owner.value?.portfolio.custom_domain : null;
  const res = await store.deleteAccount(id);
  if (!res.ok) return result(false, logged(res.error));
  if (domain) await detachDomain(domain);
  if (!DEMO) {
    try {
      await (await clerkClient()).users.deleteUser(id);
    } catch (e) {
      // The data is gone; a leftover login is harmless and can be removed from the Clerk dashboard.
      console.error("[account] data deleted but the Clerk user remains", id, e);
    }
  }
  redirect("/?deleted=1");
}

/* ---------- demo mode only ---------- */

/** Fills the demo account from the sample resume, so the UI can be explored without an AI key. */
export async function loadSampleResume(): Promise<void> {
  if (!DEMO) return;
  await store.importResume(DEMO_USER_ID, { file: Buffer.alloc(0), ext: "txt", fileName: "sample-resume.txt", parsed: SAMPLE_RESUME });
  refresh();
}

/** Deletes all demo data. */
export async function startOver(): Promise<void> {
  if (!DEMO) return;
  await resetDemo();
  refresh();
}
