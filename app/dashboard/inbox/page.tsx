import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentUserId, loadOwner, store } from "@/lib/data";
import { InboxList } from "./InboxList";

export const metadata: Metadata = { title: "Inbox" };

export default async function Inbox() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/sign-in");
  const [owner, res] = await Promise.all([loadOwner(userId), store.listMessages(userId)]);
  const contactOn = owner.ok && owner.value ? owner.value.portfolio.contact_enabled : false;

  if (!res.ok) {
    console.error("[inbox]", res.error.cause);
    return (
      <section className="db-empty db-card">
        <h1>We couldn’t load your messages.</h1>
        <p>Refresh the page. If it keeps happening, check that migration 0004 has been run in Supabase.</p>
      </section>
    );
  }

  const messages = res.value;
  return (
    <div className="ib">
      <header className="an-head">
        <div>
          <p className="db-label">Inbox</p>
          <h1>Messages from <em>your site</em></h1>
        </div>
        <p className="ib-note">
          {contactOn ? "Your contact form is on. Reply from your own email; visitors never see your address unless you reply." : <>Your contact form is off. Turn it on in the <a href="/dashboard">overview</a>.</>}
        </p>
      </header>
      {messages.length === 0 ? (
        <section className="db-card ib-empty">
          <span className="ib-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7.5 12 13l8-5.5" /><rect x="3.5" y="5" width="17" height="14" rx="3" /></svg>
          </span>
          <h2>No messages yet</h2>
          <p>When someone uses the form on your site, their message lands here.</p>
        </section>
      ) : (
        <InboxList messages={messages} />
      )}
    </div>
  );
}
