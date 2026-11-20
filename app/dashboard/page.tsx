import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUserId, loadOwner } from "@/lib/data";
import { DEMO } from "@/lib/demo";
import { githubUser } from "@/lib/links";
import { portfolioHost, portfolioUrl, ROOT_DOMAIN } from "@/lib/site";
import { loadSampleResume, setPublished, startOver } from "./actions";
import { GithubImport, OnSiteCard } from "./extras";
import { CopyLink, DetailsForm, ProjectCard, PublishButton, SubmitButton, Uploader } from "./ui";

export default async function Dashboard() {
  await connection(); // always render per request (demo mode reads no cookies, so Next would otherwise cache it)
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in");

  const res = await loadOwner(userId);
  if (!res.ok) {
    console.error("[dashboard]", res.error.cause);
    return (
      <section className="db-empty db-card">
        <h1>We couldn’t load your portfolio.</h1>
        <p>Check that Supabase is connected to Clerk (see the README), then refresh this page. To design without a backend, set NEXT_PUBLIC_DEMO_MODE=true.</p>
      </section>
    );
  }

  const view = res.value;
  if (!view) {
    return (
      <section className="db-empty">
        <p className="db-label">Step 1 of 3</p>
        <h1>Start with the resume <em>you already have.</em></h1>
        <p>Unfold reads your experience, drafts a case study for each role and builds your site. You review everything before it goes live.</p>
        <Uploader />
        {DEMO && (
          <form action={loadSampleResume} className="db-sample">
            <SubmitButton pendingLabel="Loading sample…" className="btn btn-ghost db-btn-sm">Or try a sample resume</SubmitButton>
          </form>
        )}
      </section>
    );
  }

  const { portfolio, projects: list, views30, latestResumeAt, hasResumeFile, unread } = view;
  const approved = list.filter(p => p.approved).length;
  const url = DEMO ? `/s/${portfolio.slug}` : portfolioUrl(portfolio.slug);

  return (
    <>
      <section className="db-hero">
        <div>
          <p className="db-label">Your portfolio</p>
          <h1>{portfolio.name || "Your portfolio"}</h1>
          <div className="db-address">
            <span className={`db-dot${portfolio.published ? " live" : ""}`} aria-hidden="true" />
            <span>{portfolioHost(portfolio.slug)}</span>
            <span className="db-muted">{portfolio.published ? "Live" : "Not published"}</span>
          </div>
        </div>
        <div className="db-hero-actions">
          <CopyLink url={DEMO ? `http://${ROOT_DOMAIN}${url}` : url} />
          <a className="btn btn-ghost db-btn-sm" href="/editor">Edit on page</a>
          {portfolio.published && (
            <a className="btn btn-ghost db-btn-sm" href={url} target="_blank" rel="noopener noreferrer">View site</a>
          )}
          <form action={setPublished}>
            <input type="hidden" name="published" value={portfolio.published ? "false" : "true"} />
            <PublishButton published={portfolio.published} />
          </form>
        </div>
      </section>

      <dl className="db-stats">
        <div><dt>Views, last 30 days</dt><dd>{views30.toLocaleString("en-US")}</dd></div>
        <div><dt>Projects approved</dt><dd>{approved} <span>of {list.length}</span></dd></div>
        <div><dt>Latest resume</dt><dd className="db-small">{latestResumeAt ? new Date(latestResumeAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—"}</dd></div>
      </dl>

      {approved < list.length && (
        <p className="db-note">Unfold drafted these case studies from your resume. Only projects you mark <b>Approved</b> appear on your site, so read each one first.</p>
      )}

      <div className="db-layout">
        <div className="db-side">
          <DetailsForm portfolio={portfolio} rootDomain={ROOT_DOMAIN} />
          <OnSiteCard contact={portfolio.contact_enabled} resumeUrl={portfolio.resume_url} hasResumeFile={hasResumeFile} unread={unread} />
          {portfolio.published && (
            <section className="db-card db-share" aria-labelledby="share-h">
              <div className="db-card-head">
                <h2 id="share-h">Link preview</h2>
                <p>What people see when you paste your link into LinkedIn, WhatsApp or Slack.</p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element -- the generated image itself */}
              <img src={`/s/${portfolio.slug}/opengraph-image?v=${encodeURIComponent(portfolio.updated_at)}`} alt="Your portfolio’s link preview" width={1200} height={630} loading="lazy" />
            </section>
          )}
        </div>
        <section className="db-projects" aria-labelledby="projects-h">
          <div className="db-section-head">
            <h2 id="projects-h">Projects</h2>
            <p>Shown in this order on your site.</p>
          </div>
          {list.length === 0 ? (
            <p className="db-card db-muted">No projects yet. Upload a resume that lists your roles and Unfold will add them here.</p>
          ) : (
            list.map((p, i) => <ProjectCard key={p.id} project={p} first={i === 0} last={i === list.length - 1} />)
          )}
          <GithubImport suggested={githubUser(portfolio.links)} />
          <Uploader compact />
          {DEMO && (
            <form action={startOver} className="db-sample">
              <SubmitButton pendingLabel="Clearing…" className="btn btn-ghost db-btn-sm">Start over (demo)</SubmitButton>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
