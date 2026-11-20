import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ClerkShell } from "@/app/components/ClerkShell";
import { Mark } from "@/app/components/Mark";
import { isAdmin } from "@/lib/admin";
import { currentUserId, store } from "@/lib/data";
import { hasAiKey } from "@/lib/parse-resume";
import { unpublish } from "./actions";
import "../dashboard/dashboard.css";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

/** Operator page: totals, recent sites and an unpublish switch for abuse. Hidden (404) from everyone else. */
export default async function Admin() {
  await connection();
  if (!isAdmin(await currentUserId())) notFound();
  const res = await store.adminOverview();
  const checks: Array<[string, boolean]> = [
    ["AI key for reading resumes", hasAiKey()],
    ["Service key (domains, admin, notifications)", !!process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_DEMO_MODE === "true"],
    ["Email (RESEND_API_KEY + EMAIL_FROM)", !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM],
    ["Automatic custom domains (VERCEL_TOKEN + VERCEL_PROJECT_ID)", !!process.env.VERCEL_TOKEN && !!process.env.VERCEL_PROJECT_ID],
    ["GitHub token for imports", !!process.env.GITHUB_TOKEN],
  ];
  return (
    <ClerkShell>
      <div className="db">
        <header className="db-top"><div className="wrap db-top-in"><Mark href="/dashboard" /><span className="db-demo"><i aria-hidden="true" />Admin</span></div></header>
        <main className="wrap db-main an">
          <header className="an-head"><div><p className="db-label">Admin</p><h1>How Unfold is <em>running</em></h1></div></header>
          {!res.ok ? (
            <p className="db-error" role="alert">{res.error.message}</p>
          ) : (
            <>
              <dl className="db-stats ad-stats">
                {([["Users", res.value.users], ["Portfolios", res.value.portfolios], ["Published", res.value.published], ["Uploads, 24 h", res.value.uploads24h], ["Messages", res.value.messages]] as const).map(([k, v]) => (
                  <div key={k}><dt>{k}</dt><dd>{v.toLocaleString("en-US")}</dd></div>
                ))}
              </dl>
              <section className="db-card an-card" aria-labelledby="ad-recent">
                <div className="db-card-head"><h2 id="ad-recent">Newest portfolios</h2><p>Unpublish takes a site offline; its owner can publish it again.</p></div>
                <div className="an-table ad-table">
                  <table>
                    <thead><tr><th scope="col">Name</th><th scope="col">Address</th><th scope="col">Created</th><th scope="col">Status</th></tr></thead>
                    <tbody>
                      {res.value.recent.map(p => (
                        <tr key={p.id}>
                          <td>{p.name || "—"}</td>
                          <td><a href={`/s/${p.slug}`} target="_blank" rel="noopener noreferrer">{p.slug}</a>{p.custom_domain && ` · ${p.custom_domain}`}</td>
                          <td>{p.created_at.slice(0, 10)}</td>
                          <td>
                            {p.published ? (
                              <form action={unpublish}><input type="hidden" name="id" value={p.id} /><button type="submit" className="btn btn-ghost db-btn-sm">Unpublish</button></form>
                            ) : "Draft"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          <section className="db-card an-card" aria-labelledby="ad-setup">
            <div className="db-card-head"><h2 id="ad-setup">Setup</h2><p>Optional features switch on when their keys are set.</p></div>
            <ul className="ad-checks">{checks.map(([label, on]) => <li key={label} className={on ? "on" : undefined}><i aria-hidden="true" />{label}<span>{on ? "On" : "Off"}</span></li>)}</ul>
          </section>
        </main>
      </div>
    </ClerkShell>
  );
}
