import { currentUser } from "@clerk/nextjs/server";
import { ACCEPTED_TYPES, type ResumeExt } from "@/lib/parse-resume";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient, createUserClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/supabase/types";
import { mergedPortfolioFields, newPortfolioFields, newProjects, slugCandidates } from "./merge";
import { cleanPublic, downloadName } from "./public";
import { fail, ok, type Stats, type Store } from "./types";

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

type UserClient = Awaited<ReturnType<typeof createUserClient>>;

/* ---------- public media bucket ---------- */

const MEDIA = "media";

/** The object path inside the media bucket for one of our public URLs, or null for anything else. */
function mediaPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${MEDIA}/`;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!base || !url.startsWith(base)) return null;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  return decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
}

async function removeMedia(db: UserClient, url: string | null | undefined): Promise<void> {
  const p = mediaPath(url);
  if (!p) return;
  const { error } = await db.storage.from(MEDIA).remove([p]);
  if (error) console.error("[media] couldn’t delete", p, error);
}

/** Copies the user's latest resume into the public bucket; returns its download URL. */
async function publishResume(db: UserClient, userId: string, name: string): Promise<string | null> {
  const { data: resume } = await db.from("resumes").select("file_path").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!resume) return null;
  const ext = (resume.file_path.split(".").pop() ?? "pdf").toLowerCase() as ResumeExt;
  const { data: blob, error: downloadError } = await db.storage.from("resumes").download(resume.file_path);
  if (downloadError || !blob) {
    console.error("[resume] couldn’t read the uploaded file", downloadError);
    return null;
  }
  const target = `${userId}/resume-${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from(MEDIA).upload(target, await blob.arrayBuffer(), { contentType: ACCEPTED_TYPES[ext] ?? "application/octet-stream", upsert: false });
  if (error) {
    console.error("[resume] couldn’t publish the file", error);
    return null;
  }
  return db.storage.from(MEDIA).getPublicUrl(target, { download: downloadName(name, ext) }).data.publicUrl;
}

/** Supabase backend. Every owner query runs as the signed-in user, so row-level security applies. */
export const supabaseStore: Store = {
  async loadOwner(userId) {
    const db = await createUserClient();
    const { data: portfolio, error } = await db.from("portfolios").select("*").eq("user_id", userId).maybeSingle();
    if (error) return fail("We couldn’t load your portfolio.", error);
    if (!portfolio) return ok(null);
    const [projects, views, resume, unread] = await Promise.all([
      db.from("projects").select("*").eq("portfolio_id", portfolio.id).order("position").order("created_at"),
      db.from("page_views").select("id", { count: "exact", head: true }).eq("portfolio_id", portfolio.id).gte("created_at", daysAgo(30)),
      db.from("resumes").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("messages").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
    ]);
    return ok({
      portfolio: {
        ...portfolio,
        links: portfolio.links ?? [],
        education: portfolio.education ?? [],
        theme_options: portfolio.theme_options ?? {},
        contact_enabled: portfolio.contact_enabled ?? true,
        avatar_url: portfolio.avatar_url ?? null,
        resume_url: portfolio.resume_url ?? null,
      },
      // Rows from before migration 0004 lack the media columns.
      projects: (projects.data ?? []).map((p: Partial<Project>) => ({ image_url: null, link_url: null, repo: null, stars: null, language: null, ...p }) as Project),
      views30: views.count ?? 0,
      latestResumeAt: resume.data?.created_at ?? null,
      hasResumeFile: !!resume.data,
      unread: unread.count ?? 0,
    });
  },

  async updatePortfolio(userId, edit) {
    const db = await createUserClient();
    const { error } = await db.from("portfolios").update(edit).eq("user_id", userId);
    if (error?.code === "23505") return fail(`${edit.slug ?? "That address"} is already taken. Try another address.`, error, "taken");
    if (error) return fail("We couldn’t save your changes. Try again.", error);
    return ok(null);
  },

  async setPublished(userId, published) {
    const db = await createUserClient();
    const { error } = await db.from("portfolios").update({ published }).eq("user_id", userId);
    return error ? fail("We couldn’t change publishing. Try again.", error) : ok(null);
  },

  async updateProject(userId, id, edit) {
    const db = await createUserClient();
    const { error } = await db.from("projects").update(edit).eq("id", id).eq("user_id", userId);
    return error ? fail("We couldn’t save this project. Try again.", error) : ok(null);
  },

  async deleteProject(userId, id) {
    const db = await createUserClient();
    const { data: project } = await db.from("projects").select("image_url").eq("id", id).eq("user_id", userId).maybeSingle();
    const { error } = await db.from("projects").delete().eq("id", id).eq("user_id", userId);
    if (error) return fail("We couldn’t delete this project. Try again.", error);
    await removeMedia(db, project?.image_url);
    return ok(null);
  },

  async moveProject(userId, id, dir) {
    const db = await createUserClient();
    const { data: list, error } = await db.from("projects").select("id").eq("user_id", userId).order("position").order("created_at");
    if (error || !list) return fail("We couldn’t reorder projects.", error);
    const i = list.findIndex(p => p.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return ok(null);
    const order = list.map(p => p.id);
    [order[i], order[j]] = [order[j], order[i]];
    // Rewrite positions densely so ties from older data can't block a move.
    await Promise.all(order.map((pid, position) => db.from("projects").update({ position }).eq("id", pid).eq("user_id", userId)));
    return ok(null);
  },

  async addProjects(userId, drafts) {
    const db = await createUserClient();
    const { data: portfolio, error } = await db.from("portfolios").select("id").eq("user_id", userId).maybeSingle();
    if (error) return fail("We couldn’t load your portfolio.", error);
    if (!portfolio) return fail("Upload a resume first.");
    const { data: current } = await db.from("projects").select("position, repo").eq("portfolio_id", portfolio.id);
    const repos = new Set((current ?? []).map(p => p.repo?.toLowerCase()).filter(Boolean));
    const fresh = drafts.filter(p => !p.repo || !repos.has(p.repo.toLowerCase()));
    if (!fresh.length) return ok({ added: 0 });
    const start = (current ?? []).reduce((max, p) => Math.max(max, p.position + 1), 0);
    const { error: insertError } = await db.from("projects").insert(fresh.map((p, i) => ({ portfolio_id: portfolio.id, user_id: userId, position: start + i, approved: false, ...p })));
    if (insertError?.code === "23505") return fail("Some of those repositories are already in your projects. Refresh and try again.", insertError);
    if (insertError) return fail("We couldn’t add those projects. Try again.", insertError);
    return ok({ added: fresh.length });
  },

  async importResume(userId, { file, ext, fileName, parsed }) {
    const db = await createUserClient();

    // First upload after sign-up: create the profile row.
    const { data: profile, error: profileError } = await db.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (profileError) return fail("We couldn’t load your account. Try again.", profileError);
    if (!profile) {
      const user = await currentUser();
      const { error } = await db.from("profiles").insert({ id: userId, email: user?.primaryEmailAddress?.emailAddress ?? null });
      if (error && error.code !== "23505") return fail("We couldn’t set up your account. Try again.", error);
    }

    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await db.storage.from("resumes").upload(path, file, { contentType: ACCEPTED_TYPES[ext], upsert: false });
    if (uploadError) return fail("We couldn’t store your file. Try again.", uploadError);

    const { error: resumeError } = await db.from("resumes").insert({ user_id: userId, file_path: path, file_name: fileName.slice(0, 200), parsed });
    if (resumeError) return fail("We couldn’t save your resume. Try again.", resumeError);

    const { data: existing } = await db.from("portfolios").select("*").eq("user_id", userId).maybeSingle();
    let portfolioId: string;
    if (!existing) {
      let created: { id: string } | null = null;
      for (const slug of slugCandidates(parsed.name)) {
        const { data, error } = await db.from("portfolios").insert({ user_id: userId, slug, ...newPortfolioFields(parsed) }).select("id").single();
        if (data) { created = data; break; }
        if (error && error.code !== "23505") return fail("We couldn’t create your portfolio. Try again.", error);
      }
      if (!created) return fail("We couldn’t pick a web address for you. Try again.");
      portfolioId = created.id;
    } else {
      portfolioId = existing.id;
      const merged = mergedPortfolioFields({ ...existing, links: existing.links ?? [], education: existing.education ?? [] }, parsed);
      const { error } = await db.from("portfolios").update(merged).eq("id", portfolioId);
      if (error) return fail("We couldn’t update your portfolio. Try again.", error);
      // Downloads on: swap in the new file so visitors always get the latest resume.
      if (existing.resume_url) {
        const url = await publishResume(db, userId, merged.name);
        if (url) {
          const { error: swapError } = await db.from("portfolios").update({ resume_url: url }).eq("id", portfolioId);
          if (!swapError) await removeMedia(db, existing.resume_url);
        }
      }
    }

    const { data: current } = await db.from("projects").select("title, position").eq("portfolio_id", portfolioId);
    const start = (current ?? []).reduce((max, p) => Math.max(max, p.position + 1), 0);
    const fresh = newProjects(parsed, (current ?? []).map(p => p.title));
    if (fresh.length) {
      const { error } = await db.from("projects").insert(
        fresh.map((p, i) => ({ portfolio_id: portfolioId, user_id: userId, position: start + i, ...p })),
      );
      if (error) return fail("We saved your resume but couldn’t add its projects. Try again.", error);
    }
    return ok({ added: fresh.length });
  },

  async setImage(userId, target, file) {
    const db = await createUserClient();
    const { data: portfolio, error } = await db.from("portfolios").select("id, avatar_url").eq("user_id", userId).maybeSingle();
    if (error) return fail("We couldn’t load your portfolio.", error);
    if (!portfolio) return fail("Upload a resume first.");

    let old: string | null = portfolio.avatar_url;
    if (target.kind === "project") {
      const { data: project } = await db.from("projects").select("image_url").eq("id", target.id).eq("user_id", userId).maybeSingle();
      if (!project) return fail("That project no longer exists.");
      old = project.image_url;
    }

    let url: string | null = null;
    let uploaded: string | null = null;
    if (file) {
      uploaded = `${userId}/${target.kind}-${crypto.randomUUID()}.${file.ext}`;
      const { error: uploadError } = await db.storage.from(MEDIA).upload(uploaded, file.bytes, { contentType: file.type, cacheControl: "31536000", upsert: false });
      if (uploadError) return fail("We couldn’t store that image. Try again.", uploadError);
      url = db.storage.from(MEDIA).getPublicUrl(uploaded).data.publicUrl;
    }

    const { error: saveError } =
      target.kind === "avatar"
        ? await db.from("portfolios").update({ avatar_url: url }).eq("user_id", userId)
        : await db.from("projects").update({ image_url: url }).eq("id", target.id).eq("user_id", userId);
    if (saveError) {
      if (uploaded) await db.storage.from(MEDIA).remove([uploaded]);
      return fail("We couldn’t save that image. Try again.", saveError);
    }
    await removeMedia(db, old);
    return ok({ url });
  },

  async setResumeDownload(userId, on) {
    const db = await createUserClient();
    const { data: portfolio, error } = await db.from("portfolios").select("name, resume_url").eq("user_id", userId).maybeSingle();
    if (error) return fail("We couldn’t load your portfolio.", error);
    if (!portfolio) return fail("Upload a resume first.");
    const url = on ? await publishResume(db, userId, portfolio.name) : null;
    if (on && !url) return fail("We couldn’t prepare your resume for download. Try again.");
    const { error: saveError } = await db.from("portfolios").update({ resume_url: url }).eq("user_id", userId);
    if (saveError) {
      await removeMedia(db, url);
      return fail("We couldn’t change resume downloads. Try again.", saveError);
    }
    await removeMedia(db, portfolio.resume_url);
    return ok({ url });
  },

  async getPublicPortfolio(site) {
    const { data, error } = await createPublicClient().rpc("get_public_portfolio", { site: site.toLowerCase() });
    if (error || !data || typeof data !== "object" || Array.isArray(data)) return null;
    return cleanPublic(data as Record<string, unknown>);
  },

  async recordView(portfolioId, path, referrer) {
    // RLS only accepts views for published portfolios; anything else is silently dropped.
    await createPublicClient().from("page_views").insert({ portfolio_id: portfolioId, path, referrer });
  },

  async recordClick(portfolioId, target) {
    await createPublicClient().from("portfolio_clicks").insert({ portfolio_id: portfolioId, target });
  },

  async sendMessage(portfolioId, { name, email, message }, senderHash) {
    const { data, error } = await createPublicClient().rpc("send_portfolio_message", {
      p_portfolio: portfolioId, p_name: name, p_email: email, p_message: message, p_hash: senderHash,
    });
    if (error) return fail("We couldn’t send your message. Try again.", error);
    if (data === "ok") return ok(null);
    if (data === "limited") return fail("Too many messages. Try again later.", null, "limited");
    if (data === "invalid") return fail("Check your name, email and message.", null, "invalid");
    return fail("This site isn’t taking messages right now.", null, "closed");
  },

  async listMessages(userId) {
    const db = await createUserClient();
    const { data, error } = await db.from("messages").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200);
    return error ? fail("We couldn’t load your messages.", error) : ok(data ?? []);
  },

  async markMessage(userId, id, read) {
    const db = await createUserClient();
    const { error } = await db.from("messages").update({ read_at: read ? new Date().toISOString() : null }).eq("id", id).eq("user_id", userId);
    return error ? fail("We couldn’t update that message.", error) : ok(null);
  },

  async deleteMessage(userId, id) {
    const db = await createUserClient();
    const { error } = await db.from("messages").delete().eq("id", id).eq("user_id", userId);
    return error ? fail("We couldn’t delete that message.", error) : ok(null);
  },

  async loadStats(_userId, days, timeZone) {
    const db = await createUserClient();
    let res = await db.rpc("portfolio_stats", { p_days: days, p_tz: timeZone });
    // Postgres and the browser can disagree on a rare time zone name; fall back to UTC.
    if (res.error && timeZone !== "UTC") res = await db.rpc("portfolio_stats", { p_days: days, p_tz: "UTC" });
    if (res.error || !res.data) return fail("We couldn’t load your analytics.", res.error);
    const s = res.data as unknown as Partial<Stats>;
    return ok({
      days,
      total: Number(s.total ?? 0),
      previous: Number(s.previous ?? 0),
      daily: (s.daily ?? []).map(d => ({ day: String(d.day), views: Number(d.views) })),
      referrers: (s.referrers ?? []).map(r => ({ source: String(r.source ?? ""), views: Number(r.views) })),
      clicks: (s.clicks ?? []).map(c => ({ target: String(c.target), clicks: Number(c.clicks) })),
    });
  },
  async uploadsSince(userId, sinceIso) {
    const db = await createUserClient();
    const { count } = await db.from("resumes").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", sinceIso);
    return count ?? 0;
  },

  async setCustomDomain(userId, domain) {
    // custom_domain can't be changed with the user's own token (column grants), so this needs the service role.
    const admin = createAdminClient();
    if (!admin) return fail("Custom domains aren’t set up on this server yet.");
    const { error } = await admin.from("portfolios").update({ custom_domain: domain }).eq("user_id", userId);
    if (error?.code === "23505") return fail("That domain is already connected to another portfolio.", error, "taken");
    return error ? fail("We couldn’t save that domain. Try again.", error) : ok(null);
  },

  async deleteAccount(userId) {
    const db = await createUserClient();
    // Files first (their paths are only known while the rows exist), then the profile row; the rest cascades.
    for (const bucket of ["resumes", MEDIA]) {
      for (;;) {
        const { data: files, error } = await db.storage.from(bucket).list(userId, { limit: 100 });
        if (error) return fail("We couldn’t delete your files. Try again.", error);
        if (!files?.length) break;
        const { error: removeError } = await db.storage.from(bucket).remove(files.map(f => `${userId}/${f.name}`));
        if (removeError) return fail("We couldn’t delete your files. Try again.", removeError);
      }
    }
    const { error } = await db.from("profiles").delete().eq("id", userId);
    return error ? fail("We couldn’t delete your account. Try again.", error) : ok(null);
  },

  async ownerContact(portfolioId) {
    const admin = createAdminClient();
    if (!admin) return null;
    const { data: p } = await admin.from("portfolios").select("user_id, name").eq("id", portfolioId).maybeSingle();
    if (!p) return null;
    const { data: profile } = await admin.from("profiles").select("email").eq("id", p.user_id).maybeSingle();
    return profile?.email ? { email: profile.email, name: p.name } : null;
  },

  async adminOverview() {
    const admin = createAdminClient();
    if (!admin) return fail("Set SUPABASE_SECRET_KEY to use the admin page.");
    const n = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then(r => r.count ?? 0);
    const [users, portfolios, published, uploads24h, messages, recent] = await Promise.all([
      n(admin.from("profiles").select("id", { count: "exact", head: true })),
      n(admin.from("portfolios").select("id", { count: "exact", head: true })),
      n(admin.from("portfolios").select("id", { count: "exact", head: true }).eq("published", true)),
      n(admin.from("resumes").select("id", { count: "exact", head: true }).gte("created_at", daysAgo(1))),
      n(admin.from("messages").select("id", { count: "exact", head: true })),
      admin.from("portfolios").select("id, slug, name, published, custom_domain, created_at").order("created_at", { ascending: false }).limit(50),
    ]);
    if (recent.error) return fail("We couldn’t load the overview.", recent.error);
    return ok({ users, portfolios, published, uploads24h, messages, recent: recent.data ?? [] });
  },

  async adminUnpublish(portfolioId) {
    const admin = createAdminClient();
    if (!admin) return fail("Set SUPABASE_SECRET_KEY to use the admin page.");
    const { error } = await admin.from("portfolios").update({ published: false }).eq("id", portfolioId);
    return error ? fail("We couldn’t unpublish that site.", error) : ok(null);
  },
};
