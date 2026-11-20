"use client";
/* eslint-disable @next/next/no-img-element -- previews of the user's own uploads */

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ImagePrepError, prepareImage, type ImageKind } from "@/lib/image-client";
import type { StoredThemeOptions } from "@/lib/supabase/types";
import { ACCENTS, FONT_PAIRS, MODES, normalizeOptions } from "@/lib/theme";
import { findGithubRepos, importGithubRepos, setContactForm, setResumeDownload, type ActionState, type RepoList } from "./actions";

function Spin() {
  return <span className="db-spin" aria-hidden="true" />;
}

function Note({ state }: { state: ActionState }) {
  return (
    <span className="db-status" role="status" aria-live="polite">
      {state && (
        <span key={state.at} className={state.ok ? "db-msg ok" : "db-msg err"}>
          {state.ok && <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5 6.5 11l6-6.5" /></svg>}
          {state.message}
        </span>
      )}
    </span>
  );
}

/* ---------- images ---------- */

/**
 * Avatar or project image. Uploads straight away (it isn't part of the surrounding form):
 * the image is resized in the browser first, then the page refreshes to show it everywhere.
 */
export function ImagePicker({ kind, projectId, url, label, hint }: { kind: ImageKind; projectId?: string; url: string | null; label: string; hint: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [busy, setBusy] = useState<"up" | "rm" | null>(null);
  const [error, setError] = useState("");
  // A local preview while uploading; dropped as soon as the server sends a different URL.
  const [preview, setPreview] = useState<{ src: string; base: string | null } | null>(null);
  const [, startRefresh] = useTransition();
  const shown = preview && preview.base === url ? preview.src : url;

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.src); }, [preview]);

  async function upload(file: File | undefined) {
    if (!file || busy) return;
    setError("");
    setBusy("up");
    try {
      const blob = await prepareImage(file, kind);
      setPreview({ src: URL.createObjectURL(blob), base: url });
      const body = new FormData();
      body.append("kind", kind);
      if (projectId) body.append("id", projectId);
      body.append("file", blob, blob.type === "image/webp" ? "image.webp" : "image.jpg");
      const res = await fetch("/api/media", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "We couldn’t upload that image. Try again.");
      startRefresh(() => router.refresh());
    } catch (e) {
      setPreview(null);
      setError(e instanceof ImagePrepError || e instanceof Error ? e.message : "We couldn’t upload that image. Try again.");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    if (busy) return;
    setError("");
    setBusy("rm");
    try {
      const res = await fetch("/api/media", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(projectId ? { kind, id: projectId } : { kind }) });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "We couldn’t remove that image. Try again.");
      setPreview(null);
      startRefresh(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn’t remove that image. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`db-img db-img-${kind}`} data-busy={busy ?? undefined}>
      <span className="db-img-frame" aria-hidden="true">
        {shown ? <img key={shown} src={shown} alt="" /> : <i />}
        {busy && <span className="db-img-busy"><Spin /></span>}
      </span>
      <div className="db-img-text">
        <span className="db-img-label" id={`${id}-l`}>{label}</span>
        <small>{error ? <span className="db-img-err" role="alert">{error}</span> : hint}</small>
      </div>
      <div className="db-img-actions">
        <input ref={input} id={`${id}-f`} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="db-drop-input" aria-labelledby={`${id}-l`} disabled={!!busy} onChange={e => upload(e.target.files?.[0])} />
        <label htmlFor={`${id}-f`} className="btn btn-ghost db-btn-sm" aria-disabled={!!busy || undefined}>{shown ? "Replace" : "Upload"}</label>
        {shown && <button type="button" className="btn btn-ghost db-btn-sm" onClick={remove} disabled={!!busy}>Remove</button>}
      </div>
    </div>
  );
}

/* ---------- appearance ---------- */

/** Accent, font pair and light/dark. Plain form fields: saved with the Details form. */
export function Appearance({ options }: { options: StoredThemeOptions }) {
  const o = normalizeOptions(options);
  const preset = o.accent && ACCENTS.some(a => a.hex === o.accent);
  const [choice, setChoice] = useState<string>(o.accent ? (preset ? o.accent : "custom") : "");
  const [custom, setCustom] = useState<string>(o.accent && !preset ? o.accent : "#2f54eb");
  return (
    <fieldset className="db-ap">
      <legend>Appearance <em>works with every template</em></legend>

      <div className="db-ap-row" role="radiogroup" aria-label="Accent colour">
        <span className="db-ap-name">Accent</span>
        <div className="db-ap-swatches">
          <label className="db-sw db-sw-default" title="Template colours">
            <input type="radio" name="accent" value="" checked={choice === ""} onChange={() => setChoice("")} />
            <span aria-hidden="true" />
            <span className="sr-only">Template colours</span>
          </label>
          {ACCENTS.map(a => (
            <label key={a.hex} className="db-sw" title={a.label} style={{ "--sw": a.hex } as React.CSSProperties}>
              <input type="radio" name="accent" value={a.hex} checked={choice === a.hex} onChange={() => setChoice(a.hex)} />
              <span aria-hidden="true" />
              <span className="sr-only">{a.label}</span>
            </label>
          ))}
          <label className="db-sw db-sw-custom" title="Your own colour" style={{ "--sw": custom } as React.CSSProperties}>
            <input type="radio" name="accent" value="custom" checked={choice === "custom"} onChange={() => setChoice("custom")} />
            <span aria-hidden="true" />
            <span className="sr-only">Your own colour</span>
          </label>
          {choice === "custom" && (
            <input className="db-sw-picker" type="color" name="accent_custom" value={custom} onChange={e => setCustom(e.target.value)} aria-label="Pick your accent colour" />
          )}
        </div>
      </div>

      <div className="db-ap-row" role="radiogroup" aria-label="Fonts">
        <span className="db-ap-name">Fonts</span>
        <div className="db-ap-fonts">
          {FONT_PAIRS.map(f => (
            <label key={f.id} className="db-font">
              <input type="radio" name="font" value={f.id} defaultChecked={o.font === f.id} />
              <b style={f.display ? { fontFamily: f.display } : undefined}>Aa</b>
              <small>{f.label}</small>
            </label>
          ))}
        </div>
      </div>

      <div className="db-ap-row" role="radiogroup" aria-label="Light or dark">
        <span className="db-ap-name">Mode</span>
        <div className="db-seg">
          {MODES.map(m => (
            <label key={m.id}>
              <input type="radio" name="mode" value={m.id} defaultChecked={o.mode === m.id} />
              <span>{m.label}</span>
            </label>
          ))}
        </div>
      </div>
    </fieldset>
  );
}

/* ---------- on your site ---------- */

function Toggle({ label, hint, on, disabled, onChange }: { label: string; hint: React.ReactNode; on: boolean; disabled?: boolean; onChange: (on: boolean) => Promise<ActionState> }) {
  const [state, setState] = useState<ActionState>(null);
  // The parent keys this on `on`, so a new server value resets the switch.
  const [checked, setChecked] = useState(on);
  const [pending, start] = useTransition();
  return (
    <div className="db-toggle">
      <label className="db-check">
        <input
          type="checkbox"
          checked={checked}
          disabled={pending || disabled}
          onChange={e => {
            const next = e.target.checked;
            setChecked(next);
            start(async () => {
              const res = await onChange(next);
              if (!res?.ok) setChecked(!next);
              setState(res);
            });
          }}
        />
        <span className="db-switch" aria-hidden="true" />
        <span className="db-toggle-text"><b>{label}</b><small>{hint}</small></span>
        {pending && <Spin />}
      </label>
      <Note state={state} />
    </div>
  );
}

export function OnSiteCard({ contact, resumeUrl, hasResumeFile, unread }: { contact: boolean; resumeUrl: string | null; hasResumeFile: boolean; unread: number }) {
  return (
    <section className="db-card db-onsite" aria-labelledby="onsite-h">
      <div className="db-card-head">
        <h2 id="onsite-h">On your site</h2>
        <p>Ways for visitors to reach you.</p>
      </div>
      <Toggle
        key={`c-${contact}`}
        label="Contact form"
        on={contact}
        onChange={setContactForm}
        hint={<>Messages arrive in your <a href="/dashboard/inbox">inbox</a>{unread ? ` (${unread} new)` : ""}. Your email stays private.</>}
      />
      <Toggle
        key={`r-${!!resumeUrl}`}
        label="Download résumé button"
        on={!!resumeUrl}
        disabled={!hasResumeFile && !resumeUrl}
        onChange={setResumeDownload}
        hint={hasResumeFile || resumeUrl ? "Shares your latest uploaded file. It may include your phone number and address." : "Upload your resume file to turn this on."}
      />
    </section>
  );
}

/* ---------- GitHub import ---------- */

export function GithubImport({ suggested }: { suggested: string | null }) {
  const [user, setUser] = useState(suggested ?? "");
  const [list, setList] = useState<RepoList | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [state, setState] = useState<ActionState>(null);
  const [finding, startFind] = useTransition();
  const [importing, startImport] = useTransition();

  function find(e: React.FormEvent) {
    e.preventDefault();
    setState(null);
    startFind(async () => {
      const res = await findGithubRepos(user);
      setList(res);
      // Preselect the three most-starred originals.
      setPicked(new Set(res.ok ? res.repos.filter(r => !r.fork && !r.archived).slice(0, 3).map(r => r.name) : []));
    });
  }

  function toggle(name: string) {
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else if (next.size < 10) next.add(name);
      return next;
    });
  }

  return (
    <section className="db-card db-gh" aria-labelledby="gh-h">
      <div className="db-card-head">
        <h2 id="gh-h">Import from GitHub</h2>
        <p>Turn public repositories into project drafts, with their description, README, stars and language.</p>
      </div>
      <form className="db-gh-find" onSubmit={find}>
        <span className="db-affix">
          <span className="db-affix-pre">github.com/</span>
          <input value={user} onChange={e => setUser(e.target.value)} placeholder="username" aria-label="GitHub username" spellCheck={false} autoCapitalize="none" maxLength={100} required />
        </span>
        <button type="submit" className="btn btn-ghost db-btn-sm db-sb" disabled={finding} data-pending={finding || undefined}>
          <span className="db-sb-idle">Find repositories</span>
          <span className="db-sb-busy" aria-hidden={!finding}><Spin />Looking…</span>
        </button>
      </form>

      {list && !list.ok && <p className="db-error" role="alert">{list.message}</p>}
      {list?.ok && (
        <>
          <ul className="db-repos" aria-label={`Repositories of ${list.user}`}>
            {list.repos.slice(0, 30).map(r => (
              <li key={r.fullName}>
                <label className={`db-repo-row${picked.has(r.name) ? " on" : ""}`}>
                  <input type="checkbox" checked={picked.has(r.name)} onChange={() => toggle(r.name)} />
                  <span className="db-repo-check" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3.5 8.5 6.5 11l6-6.5" /></svg></span>
                  <span className="db-repo-main">
                    <b>{r.name}</b>
                    {r.description && <small>{r.description}</small>}
                  </span>
                  <span className="db-repo-meta">
                    {r.fork && <i>fork</i>}
                    {r.archived && <i>archived</i>}
                    {r.language && <span>{r.language}</span>}
                    <span>★ {r.stars.toLocaleString("en-US")}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="db-actions">
            <Note state={state} />
            <span className="db-muted db-small-note">{picked.size} of 10 picked</span>
            <button
              type="button"
              className="btn btn-silver db-btn-sm db-sb"
              disabled={importing || picked.size === 0}
              data-pending={importing || undefined}
              onClick={() => startImport(async () => {
                const res = await importGithubRepos(list.user, [...picked]);
                setState(res);
                if (res?.ok) setPicked(new Set());
              })}
            >
              <span className="db-sb-idle">Import as drafts</span>
              <span className="db-sb-busy" aria-hidden={!importing}><Spin />Importing…</span>
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/* ---------- navigation ---------- */

const TABS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/editor", label: "Edit on page" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/inbox", label: "Inbox" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashNav({ unread }: { unread: number }) {
  const path = usePathname();
  // Remember the browser's time zone so analytics count days the way the owner does.
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) document.cookie = `uf_tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
    } catch {}
  }, []);
  return (
    <nav className="db-tabs" aria-label="Dashboard">
      {TABS.map(t => {
        const on = t.href === "/dashboard" ? path === "/dashboard" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={on ? "on" : undefined} aria-current={on ? "page" : undefined}>
            {t.label}
            {t.href === "/dashboard/inbox" && unread > 0 && <span className="db-badge" aria-label={`${unread} unread`}>{unread > 99 ? "99+" : unread}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
