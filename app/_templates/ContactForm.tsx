"use client";

import { useId, useState } from "react";
import { SAMPLE_ID } from "@/lib/sample-resume";
import "./contact.css";

type Phase = "idle" | "sending" | "sent" | "error";

/**
 * Contact form shared by every template. It inherits the template's type and takes its colours
 * from --cf-* variables that each template sets, so it looks native everywhere.
 * Messages go to the owner's inbox; the visitor's email is never shown publicly.
 */
export function ContactForm({ portfolioId, firstName }: { portfolioId: string; firstName: string }) {
  const id = useId();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase === "sending") return;
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if (portfolioId === SAMPLE_ID) {
      setPhase("error");
      setError("This is a template preview, so messages aren’t sent.");
      return;
    }
    setPhase("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ portfolioId, name: data.name, email: data.email, message: data.message, company: data.company }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "We couldn’t send your message. Try again.");
      form.reset();
      setPhase("sent");
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "We couldn’t send your message. Try again.");
    }
  }

  if (phase === "sent") {
    return (
      <div className="uf-cf uf-cf-done" role="status">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17l9-10" /></svg>
        <p><b>Message sent.</b> {firstName ? `${firstName} will reply` : "You’ll get a reply"} at the email you gave.</p>
        <button type="button" className="uf-cf-again" onClick={() => setPhase("idle")}>Send another</button>
      </div>
    );
  }

  return (
    <form className="uf-cf" onSubmit={submit} aria-describedby={`${id}-status`}>
      <div className="uf-cf-row">
        <label className="uf-cf-field">
          <span>Your name</span>
          <input name="name" required maxLength={80} autoComplete="name" />
        </label>
        <label className="uf-cf-field">
          <span>Your email</span>
          <input name="email" type="email" required maxLength={200} autoComplete="email" />
        </label>
      </div>
      <label className="uf-cf-field">
        <span>Message</span>
        <textarea name="message" required maxLength={3000} rows={4} />
      </label>
      {/* Spam trap: hidden from people, filled in by bots. */}
      <label className="uf-cf-trap" aria-hidden="true">
        Company <input name="company" tabIndex={-1} autoComplete="off" />
      </label>
      <div className="uf-cf-foot">
        <span id={`${id}-status`} className="uf-cf-status" role="status" aria-live="polite">
          {phase === "error" && <span className="uf-cf-error">{error}</span>}
        </span>
        <button type="submit" className="uf-cf-send" disabled={phase === "sending"} data-pending={phase === "sending" || undefined}>
          <span className="uf-cf-idle">Send message</span>
          <span className="uf-cf-busy" aria-hidden={phase !== "sending"}><i className="uf-cf-spin" />Sending…</span>
        </button>
      </div>
    </form>
  );
}
