import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { fillDays, safeTimeZone, sourceLabel } from "@/lib/analytics";
import { currentUserId, loadOwner, store } from "@/lib/data";
import { ViewsChart } from "./ViewsChart";

export const metadata: Metadata = { title: "Analytics" };

const RANGES = [7, 30, 90] as const;

function delta(now: number, before: number): { text: string; dir: "up" | "down" | "flat" } | null {
  if (before === 0) return now > 0 ? { text: "New this period", dir: "up" } : null;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return { text: "Same as the period before", dir: "flat" };
  return { text: `${pct > 0 ? "+" : ""}${pct}% vs the ${before.toLocaleString("en-US")} views before`, dir: pct > 0 ? "up" : "down" };
}

export default async function Analytics({ searchParams }: PageProps<"/dashboard/analytics">) {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in");

  const raw = Number((await searchParams).range);
  const days = (RANGES as readonly number[]).includes(raw) ? raw : 30;
  const tz = safeTimeZone(decodeURIComponent((await cookies()).get("uf_tz")?.value ?? ""));

  const [owner, statsRes] = await Promise.all([loadOwner(userId), store.loadStats(userId, days, tz)]);
  if (!owner.ok || !owner.value) {
    return (
      <section className="db-empty">
        <h1>No portfolio yet.</h1>
        <p>Upload your resume first. Views and clicks show up here once your site is live.</p>
        <a className="btn btn-silver db-btn-sm" href="/dashboard">Go to your dashboard</a>
      </section>
    );
  }
  if (!statsRes.ok) {
    console.error("[analytics]", statsRes.error.cause);
    return (
      <section className="db-empty db-card">
        <h1>We couldn’t load your analytics.</h1>
        <p>Refresh the page. If it keeps happening, check that migration 0004 has been run in Supabase.</p>
      </section>
    );
  }

  const { portfolio, projects } = owner.value;
  const stats = statsRes.value;
  const series = fillDays(stats.daily, days, tz);
  const change = delta(stats.total, stats.previous);
  const titles = new Map(projects.map(p => [p.id, p.title]));
  const linkLabels = new Map(portfolio.links.map(l => [l.url, l.label]));

  const projectClicks = stats.clicks.filter(c => c.target.startsWith("project:")).map(c => ({ label: titles.get(c.target.slice(8)) ?? "A project you removed", n: c.clicks }));
  const linkClicks = stats.clicks.filter(c => c.target.startsWith("link:")).map(c => ({ label: linkLabels.get(c.target.slice(5)) ?? c.target.slice(5).replace(/^(https?:\/\/|mailto:)(www\.)?/, ""), n: c.clicks }));
  const actionClicks = stats.clicks.filter(c => c.target === "email" || c.target === "resume").map(c => ({ label: c.target === "email" ? "Email links" : "Résumé downloads", n: c.clicks }));
  const totalClicks = stats.clicks.reduce((sum, c) => sum + c.clicks, 0);
  const sources = stats.referrers.map(r => ({ label: sourceLabel(r.source), n: r.views }));
  const topSource = sources.find(s => s.label !== "Direct or unknown") ?? sources[0];

  return (
    <div className="an">
      <header className="an-head">
        <div>
          <p className="db-label">Analytics</p>
          <h1>How your site is <em>doing</em></h1>
        </div>
        <nav className="db-seg an-range" aria-label="Time range">
          {RANGES.map(r => (
            <a key={r} href={`/dashboard/analytics?range=${r}`} aria-current={r === days ? "page" : undefined} className={r === days ? "on" : undefined}>
              <span>{r} days</span>
            </a>
          ))}
        </nav>
      </header>

      {!portfolio.published && (
        <p className="db-note">Your site isn’t published, so nobody can visit it yet. Publish it from the <a href="/dashboard">overview</a> to start counting.</p>
      )}

      <dl className="db-stats an-stats">
        <div>
          <dt>Views</dt>
          <dd>{stats.total.toLocaleString("en-US")}</dd>
          {change && <p className={`an-delta ${change.dir}`}>{change.text}</p>}
        </div>
        <div>
          <dt>Clicks</dt>
          <dd>{totalClicks.toLocaleString("en-US")}</dd>
          <p className="an-delta flat">Projects, links, email and résumé</p>
        </div>
        <div>
          <dt>Top source</dt>
          <dd className="db-small">{topSource ? topSource.label : "—"}</dd>
          {topSource && <p className="an-delta flat">{topSource.n.toLocaleString("en-US")} view{topSource.n === 1 ? "" : "s"}</p>}
        </div>
      </dl>

      <section className="db-card an-card" aria-labelledby="an-views-h">
        <div className="db-card-head">
          <h2 id="an-views-h">Views per day</h2>
          <p>Last {days} days, counted in your time zone ({tz.replace(/_/g, " ")}).</p>
        </div>
        {stats.total === 0 ? (
          <p className="an-empty">No views in this period yet. Share your link to get your first visitors.</p>
        ) : (
          <>
            <ViewsChart days={series} />
            <details className="an-table">
              <summary>Show as a table</summary>
              <table>
                <thead><tr><th scope="col">Day</th><th scope="col">Views</th></tr></thead>
                <tbody>
                  {[...series].reverse().map(d => (
                    <tr key={d.day}><td>{d.day}</td><td>{d.views.toLocaleString("en-US")}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </section>

      <div className="an-grid2">
        <Ranked id="an-src" title="Where visitors came from" note="From the page that linked to you, or a utm_source tag on your link." rows={sources} unit="view" empty="No visits yet." />
        <Ranked id="an-proj" title="Projects people opened" note="Clicks on each project’s link." rows={projectClicks} unit="click" empty="No project clicks yet. Add links to your projects so visitors can open them." />
        <Ranked id="an-links" title="Your links" note="LinkedIn, GitHub and the other links on your site." rows={linkClicks} unit="click" empty="No link clicks yet." />
        <Ranked id="an-act" title="Getting in touch" note="Visitors who used your email or downloaded your résumé." rows={actionClicks} unit="click" empty="Nobody has used your email link or downloaded your résumé yet." />
      </div>
    </div>
  );
}

/** A ranked list with a share bar per row. Values are text; the bar only repeats them. */
function Ranked({ id, title, note, rows, unit, empty }: { id: string; title: string; note: string; rows: Array<{ label: string; n: number }>; unit: string; empty: string }) {
  const max = Math.max(1, ...rows.map(r => r.n));
  return (
    <section className="db-card an-card" aria-labelledby={id}>
      <div className="db-card-head">
        <h2 id={id}>{title}</h2>
        <p>{note}</p>
      </div>
      {rows.length === 0 ? (
        <p className="an-empty">{empty}</p>
      ) : (
        <ol className="an-rank">
          {rows.slice(0, 8).map((r, i) => (
            <li key={`${r.label}-${i}`}>
              <span className="an-rank-label">{r.label}</span>
              <span className="an-rank-n">{r.n.toLocaleString("en-US")}<span className="sr-only"> {unit}{r.n === 1 ? "" : "s"}</span></span>
              <span className="an-rank-bar" aria-hidden="true"><i style={{ width: `${(r.n / max) * 100}%` }} /></span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
