import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUserId, loadOwner } from "@/lib/data";
import { dnsRecord } from "@/lib/domains";
import { portfolioHost } from "@/lib/site";
import { DeleteAccount, DomainForm } from "./SettingsForms";

export const metadata: Metadata = { title: "Settings" };

export default async function Settings() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in");
  const owner = await loadOwner(userId);
  const portfolio = owner.ok ? owner.value?.portfolio : null;
  const domain = portfolio?.custom_domain ?? null;
  return (
    <div className="an">
      <header className="an-head">
        <div>
          <p className="db-label">Settings</p>
          <h1>Domain and <em>account</em></h1>
        </div>
      </header>

      {portfolio && (
        <section className="db-card an-card" aria-labelledby="dom-h">
          <div className="db-card-head">
            <h2 id="dom-h">Your own domain</h2>
            <p>Show your portfolio at a domain you own. It keeps working at {portfolioHost(portfolio.slug)} too.</p>
          </div>
          <DomainForm domain={domain} />
          {domain && (
            <div className="st-dns">
              <p>Add this record where you bought the domain. It can take up to an hour to start working; HTTPS is set up automatically.</p>
              <table>
                <thead><tr><th scope="col">Type</th><th scope="col">Name</th><th scope="col">Value</th></tr></thead>
                <tbody><tr><td>{dnsRecord(domain).type}</td><td>{dnsRecord(domain).name}</td><td>{dnsRecord(domain).value}</td></tr></tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="db-card an-card st-danger" aria-labelledby="del-h">
        <div className="db-card-head">
          <h2 id="del-h">Delete account</h2>
          <p>Removes your portfolio, projects, uploaded resumes, images, messages and analytics, and takes your site offline. This can’t be undone.</p>
        </div>
        <DeleteAccount />
      </section>
    </div>
  );
}
