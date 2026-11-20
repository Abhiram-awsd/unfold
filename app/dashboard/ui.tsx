"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { educationLines, linkLines } from "@/lib/links";
import type { Portfolio, Project } from "@/lib/supabase/types";
import { TEMPLATES, type TemplateId } from "@/lib/templates";
import { deleteProject, moveProject, saveDetails, saveProject, type ActionState } from "./actions";
import { Appearance, ImagePicker } from "./extras";

/* ---------- small pieces ---------- */

export function Spinner() {
  return <span className="db-spin" aria-hidden="true" />;
}

/**
 * Submit button with a pending state. Both labels sit in the same grid cell and crossfade
 * (with a touch of blur), so the button never changes width while it works.
 */
export function SubmitButton({ children, pendingLabel, className = "btn btn-silver" }: { children: React.ReactNode; pendingLabel: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={`${className} db-sb`} type="submit" disabled={pending} aria-busy={pending} data-pending={pending || undefined}>
      <span className="db-sb-idle">{children}</span>
      <span className="db-sb-busy" aria-hidden={!pending}><Spinner />{pendingLabel}</span>
    </button>
  );
}

/** Publish / unpublish. Publishing is a rare, happy moment, so it gets a small spark burst. */
export function PublishButton({ published }: { published: boolean }) {
  const sparks = useRef<HTMLSpanElement>(null);
  function burst() {
    const host = sparks.current;
    if (published || !host || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (let i = 0; i < 10; i++) {
      const s = document.createElement("i");
      s.style.setProperty("--a", `${i * 36 + Math.random() * 12}deg`);
      s.style.setProperty("--d", `${26 + Math.random() * 14}px`);
      host.appendChild(s);
      s.addEventListener("animationend", () => s.remove(), { once: true });
    }
  }
  return (
    <span className="db-spark-host">
      <span className="db-sparks" ref={sparks} aria-hidden="true" />
      <span onClick={burst}>
        <SubmitButton pendingLabel={published ? "Unpublishing…" : "Publishing…"} className={published ? "btn btn-ghost db-btn-sm" : "btn btn-silver db-btn-sm"}>
          {published ? "Unpublish" : "Publish site"}
        </SubmitButton>
      </span>
    </span>
  );
}

/** Shows the result of a server action next to its button. Success fades out on its own (CSS). */
export function Status({ state }: { state: ActionState }) {
  return (
    <span className="db-status" role="status" aria-live="polite">
      {state && (
        <span key={state.at} className={state.ok ? "db-msg ok" : "db-msg err"}>
          {state.ok && (
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5 6.5 11l6-6.5" /></svg>
          )}
          {state.message}
        </span>
      )}
    </span>
  );
}

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      className="btn btn-ghost db-btn-sm db-copy"
      data-copied={copied || undefined}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 1600);
        } catch {
          window.prompt("Copy your link", url);
        }
      }}
    >
      <span className="db-sb-idle">Copy link</span>
      <span className="db-sb-busy" aria-hidden={!copied}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5 6.5 11l6-6.5" /></svg>Copied
      </span>
    </button>
  );
}

/* ---------- resume upload ---------- */

/** Honest stage labels with the time (seconds) each one usually starts. Parsing takes 10–40s. */
const STAGES: Array<[string, number]> = [
  ["Uploading your file", 0],
  ["Reading your experience", 2],
  ["Drafting your case studies", 12],
  ["Building your portfolio", 28],
];

type Phase = "idle" | "busy" | "done" | "error";

export function Uploader({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [doneNote, setDoneNote] = useState("");
  const [over, setOver] = useState(false);
  const [shake, setShake] = useState(0);
  const [fileName, setFileName] = useState("");

  // While busy: step the checklist by elapsed time and ease the bar toward 92% (never "done" until it is).
  useEffect(() => {
    if (phase !== "busy") return;
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      if (bar.current) bar.current.style.transform = `scaleX(${(0.92 * (1 - Math.exp(-t / 16))).toFixed(4)})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const timer = setInterval(() => {
      const t = (performance.now() - start) / 1000;
      setStage(STAGES.reduce((acc, [, at], i) => (t >= at ? i : acc), 0));
    }, 400);
    return () => { cancelAnimationFrame(raf); clearInterval(timer); };
  }, [phase]);

  async function upload(file: File | undefined) {
    if (!file || phase === "busy") return;
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const reject = (msg: string) => { setError(msg); setShake(s => s + 1); };
    if (!["pdf", "docx", "txt"].includes(ext)) return reject("Upload a PDF, DOCX or TXT file.");
    if (file.size > 10 * 1024 * 1024) return reject("That file is over 10 MB. Try a smaller export.");
    setFileName(file.name);
    setStage(0);
    setPhase("busy");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/resumes", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { error?: string; added?: number; sample?: boolean };
      if (!res.ok) throw new Error(json.error ?? "Something went wrong. Try again.");
      setStage(STAGES.length);
      if (bar.current) bar.current.style.transform = "scaleX(1)";
      setDoneNote(
        json.sample
          ? "Demo mode has no AI key, so we loaded the sample resume."
          : json.added
            ? `Added ${json.added} project${json.added === 1 ? "" : "s"}.`
            : "Your details are up to date.",
      );
      setPhase("done");
      setTimeout(() => router.refresh(), 900); // let the finished checklist register before the page changes
      if (compact) setTimeout(() => setPhase("idle"), 3200); // the compact uploader stays on the page: return to idle
    } catch (e) {
      setPhase("error");
      reject(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  const busy = phase === "busy" || phase === "done";

  return (
    <div
      key={shake}
      className={`db-drop${compact ? " compact" : ""}${over ? " over" : ""}${busy ? " busy" : ""}${shake ? " shake" : ""}`}
      onDragOver={e => { e.preventDefault(); if (!busy) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files[0]); }}
    >
      <input
        ref={input}
        id={compact ? "resume-file-again" : "resume-file"}
        type="file"
        accept=".pdf,.docx,.txt"
        className="db-drop-input"
        disabled={busy}
        aria-describedby={compact ? undefined : "resume-help"}
        onChange={e => upload(e.target.files?.[0])}
      />
      {busy ? (
        <div className="db-scan" aria-live="polite">
          <div className="db-sheet" aria-hidden="true">
            <span className="db-sheet-name" />
            <span className="db-sheet-role" />
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} className={`db-sheet-line${i === 0 || i === 4 ? " head" : ""}`} style={{ "--i": i } as React.CSSProperties} />
            ))}
            {phase === "busy" && <span className="db-beam" />}
          </div>
          <div className="db-steps">
            <p className="db-file" title={fileName}>{fileName}</p>
            <ol>
              {STAGES.map(([label], i) => {
                const state = i < stage ? "done" : i === stage ? "now" : "todo";
                return (
                  <li key={label} className={`db-step ${state}`}>
                    <span className="db-step-icon" aria-hidden="true">
                      {state === "done" ? (
                        <svg viewBox="0 0 16 16"><path d="M3.5 8.5 6.5 11l6-6.5" /></svg>
                      ) : state === "now" ? <Spinner /> : <i />}
                    </span>
                    <span className="db-step-label">{label}</span>
                  </li>
                );
              })}
            </ol>
            <span className="db-track" aria-hidden="true"><span ref={bar} className="db-bar" /></span>
            <small>{phase === "done" ? doneNote : "This usually takes under a minute. Keep this tab open."}</small>
          </div>
        </div>
      ) : (
        <label htmlFor={compact ? "resume-file-again" : "resume-file"} className="db-drop-idle">
          <span className="db-drop-icon" aria-hidden="true">
            <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 15V4M6.5 8.5 11 4l4.5 4.5M4 15v2.5A1.5 1.5 0 0 0 5.5 19h11a1.5 1.5 0 0 0 1.5-1.5V15" /></svg>
          </span>
          <b>{over ? "Drop to unfold it" : compact ? "Upload a newer resume" : "Drop your resume here, or click to choose"}</b>
          <small id={compact ? undefined : "resume-help"}>{compact ? "We’ll add new projects and keep your edits." : "PDF, DOCX or TXT · up to 10 MB"}</small>
          {!compact && <small className="db-consent">Your resume is read by an AI service to draft your site. Remove anything you don’t want shared. <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy</a></small>}
        </label>
      )}
      {error && !busy && <p className="db-error" role="alert">{error}</p>}
    </div>
  );
}

/* ---------- portfolio details ---------- */

const TEMPLATE_NOTES: Record<TemplateId, string> = {
  minimal: "Light, typographic",
  dark: "Split, near-black",
  interactive: "Cursor previews",
  creative: "Bold colour",
  modern: "Bento grid",
  developer: "Chrome, GitHub map",
  atelier: "Premium · classic 3D",
  prism: "Premium · modern 3D",
  mono: "Premium · minimal 3D",
};

export function DetailsForm({ portfolio, rootDomain }: { portfolio: Portfolio; rootDomain: string }) {
  const [state, action] = useActionState(saveDetails, null);
  return (
    <form action={action} className="db-card db-form">
      <div className="db-card-head">
        <h2>Details</h2>
        <p>What visitors see at the top of your site.</p>
      </div>

      <ImagePicker kind="avatar" url={portfolio.avatar_url} label="Photo" hint="Square works best. Shown next to your name." />

      <div className="db-grid2">
        <label className="db-field"><span>Name</span>
          <input id="f-name" name="name" defaultValue={portfolio.name} required maxLength={80} autoComplete="name" />
        </label>
        <label className="db-field"><span>Location</span>
          <input id="f-location" name="location" defaultValue={portfolio.location ?? ""} maxLength={80} placeholder="Bengaluru" />
        </label>
      </div>
      <label className="db-field"><span>Headline</span>
        <input id="f-headline" name="headline" defaultValue={portfolio.headline} maxLength={140} placeholder="Designing calm software for busy teams." />
      </label>
      <label className="db-field"><span>About you</span>
        <textarea id="f-bio" name="bio" defaultValue={portfolio.bio} maxLength={1200} rows={4} />
      </label>
      <label className="db-field"><span>Skills <em>comma separated</em></span>
        <input id="f-skills" name="skills" defaultValue={portfolio.skills.join(", ")} placeholder="Figma, Prototyping, User research" />
      </label>
      <label className="db-field"><span>Links <em>one per line, e.g. GitHub | github.com/you</em></span>
        <textarea id="f-links" name="links" defaultValue={linkLines(portfolio.links)} rows={3} spellCheck={false} placeholder={"LinkedIn | linkedin.com/in/you\nGitHub | github.com/you"} />
      </label>
      <label className="db-field"><span>Education <em>one per line: School | Degree | Years</em></span>
        <textarea id="f-education" name="education" defaultValue={educationLines(portfolio.education)} rows={3} placeholder="University of Mumbai | B.Tech Computer Science | 2018–2022" />
      </label>

      <div className="db-grid2">
        <label className="db-field"><span>Contact email</span>
          <input id="f-email" name="email" type="email" defaultValue={portfolio.email ?? ""} autoComplete="email" />
        </label>
        <label className="db-check">
          <input id="f-show-email" name="show_email" type="checkbox" defaultChecked={portfolio.show_email} />
          <span className="db-switch" aria-hidden="true" />
          Show my email on the site
        </label>
      </div>

      <label className="db-field"><span>Web address</span>
        <span className="db-affix">
          <input id="f-slug" name="slug" defaultValue={portfolio.slug} required minLength={3} maxLength={40} pattern="[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]" spellCheck={false} autoCapitalize="none" />
          <span>.{rootDomain}</span>
        </span>
      </label>

      <fieldset className="db-themes">
        <legend>Template <em>all free</em></legend>
        {TEMPLATES.map(t => (
          <label key={t.id} className={`db-theme t-${t.id}`}>
            <input type="radio" name="theme" value={t.id} defaultChecked={portfolio.theme === t.id} />
            <span className="db-theme-swatch" aria-hidden="true"><i /><i /><i /></span>
            <b>{t.name}</b>
            <small>{TEMPLATE_NOTES[t.id]}</small>
          </label>
        ))}
        <a className="db-preview-link" href="/templates" target="_blank" rel="noopener noreferrer">
          See every template with sample content ↗
        </a>
      </fieldset>

      <Appearance options={portfolio.theme_options} />

      <div className="db-actions">
        <Status state={state} />
        <SubmitButton pendingLabel="Saving…">Save details</SubmitButton>
      </div>
    </form>
  );
}

/* ---------- projects ---------- */

export function ProjectCard({ project, first, last }: { project: Project; first: boolean; last: boolean }) {
  const [state, action] = useActionState(saveProject, null);
  const [confirming, setConfirming] = useState(false);
  return (
    <article className="db-card db-project">
      <form action={action} className="db-form">
        <input type="hidden" name="id" value={project.id} />
        <div className="db-project-head">
          <span className={`db-pill${project.approved ? " ok" : ""}`}>{project.approved ? "Approved" : "Draft"}</span>
          <div className="db-order">
            <button type="submit" formAction={moveProject} name="dir" value="up" className="db-icon" disabled={first} aria-label={`Move ${project.title} up`}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10l4-4 4 4" /></svg>
            </button>
            <button type="submit" formAction={moveProject} name="dir" value="down" className="db-icon" disabled={last} aria-label={`Move ${project.title} down`}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4" /></svg>
            </button>
          </div>
        </div>
        <div className="db-grid3">
          <label className="db-field"><span>Title</span>
            <input name="title" defaultValue={project.title} required maxLength={80} />
          </label>
          <label className="db-field"><span>Organisation</span>
            <input name="organization" defaultValue={project.organization ?? ""} maxLength={80} />
          </label>
          <label className="db-field"><span>When</span>
            <input name="period" defaultValue={project.period ?? ""} maxLength={40} placeholder="2022–2024" />
          </label>
        </div>
        <label className="db-field"><span>One-line summary</span>
          <input name="summary" defaultValue={project.summary} maxLength={240} />
        </label>
        <label className="db-field"><span>Case study <em>{project.repo ? "taken from the README, check every word" : "drafted from your resume, check every word"}</em></span>
          <textarea name="story" defaultValue={project.story} maxLength={2000} rows={4} />
        </label>
        <label className="db-field"><span>Link <em>live site, repository or write-up</em></span>
          <input name="link_url" type="text" inputMode="url" defaultValue={project.link_url ?? ""} maxLength={300} placeholder="example.com/project" spellCheck={false} autoCapitalize="none" />
        </label>
        <ImagePicker kind="project" projectId={project.id} url={project.image_url} label="Image" hint="A screenshot or cover. Replaces the generated artwork." />
        {project.repo && (
          <p className="db-repo">
            <span>github.com/{project.repo}</span>
            {project.stars != null && <span>★ {project.stars.toLocaleString("en-US")}</span>}
            {project.language && <span>{project.language}</span>}
          </p>
        )}
        <div className="db-actions">
          <label className="db-check">
            <input name="approved" type="checkbox" defaultChecked={project.approved} />
            <span className="db-switch" aria-hidden="true" />
            Approved
          </label>
          <Status state={state} />
          {confirming ? (
            <span className="db-confirm">
              Delete this project?
              <button type="submit" formAction={deleteProject} className="btn db-btn-sm db-danger">Delete</button>
              <button type="button" className="btn btn-ghost db-btn-sm" onClick={() => setConfirming(false)}>Keep</button>
            </span>
          ) : (
            <button type="button" className="btn btn-ghost db-btn-sm" onClick={() => setConfirming(true)}>Delete</button>
          )}
          <SubmitButton pendingLabel="Saving…" className="btn btn-silver db-btn-sm">Save</SubmitButton>
        </div>
      </form>
    </article>
  );
}
