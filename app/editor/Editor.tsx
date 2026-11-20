"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FIELDS, isFieldKey, isProjectField, PORTFOLIO_FIELDS, type FieldKey } from "@/lib/fields";
import type { Theme } from "@/lib/supabase/types";
import { TEMPLATES } from "@/lib/templates";
import { ACCENTS, FONT_PAIRS, HEX, MODES, type FontPair, type Mode } from "@/lib/theme";
import { saveField, saveLook } from "./actions";

type ProjectValues = { title: string; organization: string; period: string; summary: string; story: string; link_url: string };
type Look = { theme: Theme; accent: string | null; font: FontPair; mode: Mode };

export type EditorData = {
  values: Record<string, string>;
  projects: Record<string, ProjectValues>;
  look: Look;
  published: boolean;
  liveUrl: string;
  drafts: number;
  showEmail: boolean;
};

type Editing = { key: FieldKey; id: string | null; anchor: HTMLElement | null };
type Status = { kind: "saving" | "saved" | "error"; text: string; at: number } | null;

const NATIVE_FOCUSABLE = "a[href],button,input,textarea,select,summary,[tabindex]";

/**
 * The on-page editor. The template renders exactly as on the live site; this wrapper listens
 * (in the capture phase, before the template's own handlers) for clicks on elements marked
 * data-edit and opens a small editor next to them. Links and forms are inert while editing.
 * Saving calls a server action and refreshes the server render, so React updates the page
 * normally: nothing here ever writes into the template's DOM text.
 */
export function Editor({ data, children }: { data: EditorData; children: React.ReactNode }) {
  const router = useRouter();
  const canvas = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [panel, setPanel] = useState<"fields" | "look" | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [toast, setToast] = useState<{ text: string; at: number } | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const dirty = useRef(false); // an open editor has unsaved changes

  const flash = useCallback((text: string) => setToast({ text, at: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (status?.kind !== "saved") return;
    const t = setTimeout(() => setStatus(null), 2000);
    return () => clearTimeout(t);
  }, [status]);

  const open = useCallback(
    (el: HTMLElement) => {
      const key = el.dataset.edit ?? "";
      if (!isFieldKey(key)) return;
      const id = el.dataset.id ?? null;
      if (dirty.current) return flash("Save or cancel your change first.");
      if (isProjectField(key) && (!id || !data.projects[id])) return flash("That project changed. Refresh the page.");
      setPanel(null);
      setEditing({ key, id, anchor: el });
    },
    [data.projects, flash],
  );

  // Wire the canvas: mark editable elements, intercept clicks, keep links and forms inert.
  useEffect(() => {
    const root = canvas.current;
    if (!root) return;
    const mark = () => {
      root.querySelectorAll<HTMLElement>("[data-edit]").forEach(n => {
        if (!n.matches(NATIVE_FOCUSABLE)) n.tabIndex = 0;
      });
      // Show collapsed case studies (Minimal uses <details>) so every field can be reached.
      root.querySelectorAll<HTMLDetailsElement>("details:not([open])").forEach(d => (d.open = true));
    };
    mark();
    const mo = new MutationObserver(mark);
    mo.observe(root, { childList: true, subtree: true });

    const onClick = (e: MouseEvent) => {
      const t = e.target as Element | null;
      const hit = t?.closest<HTMLElement>("[data-edit]");
      if (hit && root.contains(hit)) {
        e.preventDefault();
        e.stopPropagation();
        open(hit);
        return;
      }
      const a = t?.closest("a[href]");
      if (a && root.contains(a) && !(a.getAttribute("href") ?? "").startsWith("#")) {
        e.preventDefault();
        e.stopPropagation();
        flash("Links don’t open while you’re editing. Use View live to try them.");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if ((e.key === "Enter" || e.key === " ") && t?.dataset?.edit && root.contains(t)) {
        e.preventDefault();
        e.stopPropagation();
        open(t);
      }
    };
    const onSubmit = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      flash("Forms don’t send while you’re editing.");
    };
    root.addEventListener("click", onClick, true);
    root.addEventListener("keydown", onKey, true);
    root.addEventListener("submit", onSubmit, true);
    return () => {
      mo.disconnect();
      root.removeEventListener("click", onClick, true);
      root.removeEventListener("keydown", onKey, true);
      root.removeEventListener("submit", onSubmit, true);
    };
  }, [open, flash]);

  // Outline the element being edited.
  useEffect(() => {
    const el = editing?.anchor;
    if (!el || !canvas.current?.contains(el)) return;
    el.setAttribute("data-ed-active", "");
    return () => el.removeAttribute("data-ed-active");
  }, [editing]);

  function initialValue(e: Editing): string {
    if (isProjectField(e.key)) return e.id ? data.projects[e.id]?.[e.key.slice(8) as keyof ProjectValues] ?? "" : "";
    return data.values[e.key] ?? "";
  }

  async function save(e: Editing, value: string): Promise<string | null> {
    setStatus({ kind: "saving", text: "Saving…", at: Date.now() });
    const res = await saveField(e.key, e.id, value);
    if (!res.ok) {
      setStatus({ kind: "error", text: res.message, at: Date.now() });
      return res.message;
    }
    setStatus({ kind: "saved", text: "Saved", at: Date.now() });
    startRefresh(() => router.refresh());
    return null;
  }

  return (
    <div className="ed">
      <div ref={canvas} className="ed-canvas" data-refreshing={refreshing || undefined}>
        {children}
      </div>

      <div className="ed-bar" role="toolbar" aria-label="Editor">
        <a className="ed-btn ed-back" href="/dashboard">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 8H3M7 4 3 8l4 4" /></svg>
          <span>Dashboard</span>
        </a>
        <span className="ed-hint">Click any text to edit it</span>
        <button type="button" className={`ed-btn${panel === "fields" ? " on" : ""}`} aria-expanded={panel === "fields"} onClick={() => { if (dirty.current) return flash("Save or cancel your change first."); setEditing(null); setPanel(p => (p === "fields" ? null : "fields")); }}>
          Fields
        </button>
        <button type="button" className={`ed-btn${panel === "look" ? " on" : ""}`} aria-expanded={panel === "look"} onClick={() => { if (dirty.current) return flash("Save or cancel your change first."); setEditing(null); setPanel(p => (p === "look" ? null : "look")); }}>
          Look
        </button>
        <span className="ed-status" role="status" aria-live="polite">
          {status && (
            <span key={status.at} className={`ed-st ${status.kind}`}>
              {status.kind === "saving" ? <i className="ed-spin" aria-hidden="true" /> : status.kind === "saved" ? <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5 6.5 11l6-6.5" /></svg> : null}
              {status.kind === "error" ? "Not saved" : status.text}
            </span>
          )}
        </span>
        {data.published ? (
          <a className="ed-btn ed-live" href={data.liveUrl} target="_blank" rel="noopener noreferrer"><i aria-hidden="true" />View live</a>
        ) : (
          <a className="ed-btn ed-off" href="/dashboard" title="Publish from the dashboard">Not published</a>
        )}

        {panel === "fields" && (
          <FieldsPanel
            data={data}
            onPick={key => { setPanel(null); setEditing({ key, id: null, anchor: null }); }}
            onClose={() => setPanel(null)}
          />
        )}
        {panel === "look" && <LookPanel look={data.look} onClose={() => setPanel(null)} onSaved={() => startRefresh(() => router.refresh())} onStatus={setStatus} />}
      </div>

      {editing && (
        <FieldPopover
          key={`${editing.key}:${editing.id ?? ""}`}
          editing={editing}
          initial={initialValue(editing)}
          note={editing.key === "email" && !data.showEmail ? "Your email is hidden on the site. Turn on “Show my email” in the overview to show it." : undefined}
          onClose={() => setEditing(null)}
          onDirty={d => (dirty.current = d)}
          onSave={save}
        />
      )}

      {toast && <div key={toast.at} className="ed-toast" role="status">{toast.text}</div>}
    </div>
  );
}

/* ---------- one field ---------- */

function FieldPopover({ editing, initial, note, onClose, onDirty, onSave }: {
  editing: Editing;
  initial: string;
  note?: string;
  onClose: () => void;
  onDirty: (dirty: boolean) => void;
  onSave: (e: Editing, value: string) => Promise<string | null>;
}) {
  const def = FIELDS[editing.key];
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean; sheet: boolean } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const multiline = def.kind === "text";
  const dirty = value !== initial;
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);

  // Place next to the edited element (below, or above when there's no room); a bottom sheet on phones.
  useLayoutEffect(() => {
    const place = () => {
      const el = box.current;
      if (!el) return;
      const sheet = innerWidth < 640;
      const anchor = editing.anchor?.isConnected ? editing.anchor.getBoundingClientRect() : null;
      if (sheet || !anchor) {
        setPos({ top: 0, left: 0, above: false, sheet: true });
        return;
      }
      const w = el.offsetWidth, h = el.offsetHeight;
      const above = anchor.bottom + h + 16 > innerHeight && anchor.top - h - 16 > 0;
      const top = above ? anchor.top - h - 10 : Math.min(anchor.bottom + 10, innerHeight - h - 12);
      const left = Math.min(Math.max(12, anchor.left), innerWidth - w - 12);
      setPos({ top: top + scrollY, left: left + scrollX, above, sheet: false });
    };
    place();
    addEventListener("resize", place);
    return () => removeEventListener("resize", place);
  }, [editing.anchor]);

  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  // Close on a click outside, unless there are unsaved changes.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (box.current?.contains(e.target as Node)) return;
      if (!dirty) onClose();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [dirty, onClose]);

  async function submit() {
    if (saving) return;
    if (!dirty) return onClose();
    setSaving(true);
    setError(null);
    const message = await onSave(editing, value);
    setSaving(false);
    if (message) setError(message);
    else onClose();
  }

  const restoreFocus = () => editing.anchor?.isConnected && editing.anchor.focus({ preventScroll: true });

  // Esc cancels wherever focus is (the Save button loses focus while it's disabled).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onClose();
      if (editing.anchor?.isConnected) editing.anchor.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editing.anchor, onClose]);

  const content = (
    <div
      ref={box}
      className={`ed-pop${pos?.sheet ? " sheet" : ""}${pos?.above ? " above" : ""}`}
      style={pos && !pos.sheet ? { top: pos.top, left: pos.left } : undefined}
      data-ready={pos ? "" : undefined}
      role="dialog"
      aria-label={`Edit ${def.label.toLowerCase()}`}
      onKeyDown={e => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !multiline) && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); submit(); }
      }}
    >
      <label className="ed-pop-label" htmlFor="ed-input">{def.label}</label>
      {multiline ? (
        <textarea id="ed-input" ref={input} value={value} maxLength={def.max} rows={editing.key === "project.story" || editing.key === "bio" ? 7 : 4} onChange={e => setValue(e.target.value)} placeholder={"placeholder" in def ? def.placeholder : undefined} spellCheck />
      ) : (
        <input
          id="ed-input"
          ref={input}
          value={value}
          maxLength={def.max}
          type={def.kind === "email" ? "email" : "text"}
          inputMode={def.kind === "url" ? "url" : def.kind === "email" ? "email" : undefined}
          autoCapitalize={def.kind === "url" || def.kind === "email" ? "none" : undefined}
          spellCheck={def.kind === "line"}
          placeholder={"placeholder" in def ? def.placeholder : undefined}
          onChange={e => setValue(e.target.value)}
        />
      )}
      <div className="ed-pop-meta">
        <span className={error ? "ed-pop-err" : undefined} role={error ? "alert" : undefined}>{error ?? note ?? ("hint" in def ? def.hint : "")}</span>
        <span className="ed-count">{value.length}/{def.max}</span>
      </div>
      <div className="ed-pop-actions">
        <span className="ed-keys">{multiline ? "⌘/Ctrl + Enter to save" : "Enter to save"} · Esc to cancel</span>
        <button type="button" className="ed-btn" onClick={() => { onClose(); restoreFocus(); }}>Cancel</button>
        <button type="button" className="ed-btn ed-save" onClick={submit} disabled={saving} data-pending={saving || undefined}>
          <span className="ed-save-idle">Save</span>
          <span className="ed-save-busy" aria-hidden={!saving}><i className="ed-spin" />Saving</span>
        </button>
      </div>
    </div>
  );
  return createPortal(content, document.body);
}

/* ---------- every field, including empty ones ---------- */

function FieldsPanel({ data, onPick, onClose }: { data: EditorData; onPick: (k: FieldKey) => void; onClose: () => void }) {
  usePanelDismiss(onClose);
  return (
    <div className="ed-panel" role="dialog" aria-label="All fields">
      <p className="ed-panel-title">Your details</p>
      <ul className="ed-fields">
        {PORTFOLIO_FIELDS.map(k => {
          const v = (data.values[k] ?? "").replace(/\s+/g, " ").trim();
          return (
            <li key={k}>
              <button type="button" onClick={() => onPick(k)}>
                <b>{FIELDS[k].label}</b>
                <span className={v ? undefined : "empty"}>{v || "Empty, click to add"}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="ed-panel-note">
        Click project text on the page to edit it.
        {data.drafts > 0 && <> {data.drafts} draft{data.drafts === 1 ? " isn’t" : "s aren’t"} shown: approve {data.drafts === 1 ? "it" : "them"} in the <a href="/dashboard">overview</a>.</>}
      </p>
    </div>
  );
}

/* ---------- template and appearance ---------- */

function LookPanel({ look, onClose, onSaved, onStatus }: { look: Look; onClose: () => void; onSaved: () => void; onStatus: (s: Status) => void }) {
  usePanelDismiss(onClose);
  const [current, setCurrent] = useState<Look>(look);
  const [custom, setCustom] = useState(look.accent && !ACCENTS.some(a => a.hex === look.accent) ? look.accent : "#2f54eb");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function change(next: Partial<Look>, delay = 0) {
    const value = { ...current, ...next };
    setCurrent(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      onStatus({ kind: "saving", text: "Saving…", at: Date.now() });
      const res = await saveLook(value);
      if (res.ok) {
        onStatus({ kind: "saved", text: "Saved", at: Date.now() });
        onSaved();
      } else onStatus({ kind: "error", text: res.message, at: Date.now() });
    }, delay);
  }

  const isCustom = !!current.accent && !ACCENTS.some(a => a.hex === current.accent);
  return (
    <div className="ed-panel ed-look" role="dialog" aria-label="Template and appearance">
      <p className="ed-panel-title">Template</p>
      <div className="ed-templates" role="radiogroup" aria-label="Template">
        {TEMPLATES.map(t => (
          <button key={t.id} type="button" role="radio" aria-checked={current.theme === t.id} className={current.theme === t.id ? "on" : undefined} onClick={() => change({ theme: t.id })}>
            <span className={`ed-tpl t-${t.id}`} aria-hidden="true"><i /><i /><i /></span>
            {t.name}
          </button>
        ))}
      </div>

      <p className="ed-panel-title">Accent</p>
      <div className="ed-swatches" role="radiogroup" aria-label="Accent colour">
        <button type="button" role="radio" aria-checked={!current.accent} className={`ed-sw ed-sw-default${!current.accent ? " on" : ""}`} onClick={() => change({ accent: null })} aria-label="Template colours" />
        {ACCENTS.map(a => (
          <button key={a.hex} type="button" role="radio" aria-checked={current.accent === a.hex} className={`ed-sw${current.accent === a.hex ? " on" : ""}`} style={{ "--sw": a.hex } as React.CSSProperties} onClick={() => change({ accent: a.hex })} aria-label={a.label} />
        ))}
        <label className={`ed-sw ed-sw-custom${isCustom ? " on" : ""}`} style={{ "--sw": custom } as React.CSSProperties} aria-label="Your own colour">
          <input
            type="color"
            value={custom}
            onChange={e => {
              setCustom(e.target.value);
              if (HEX.test(e.target.value)) change({ accent: e.target.value.toLowerCase() }, 400);
            }}
          />
        </label>
      </div>

      <p className="ed-panel-title">Fonts</p>
      <div className="ed-fonts" role="radiogroup" aria-label="Fonts">
        {FONT_PAIRS.map(f => (
          <button key={f.id} type="button" role="radio" aria-checked={current.font === f.id} className={current.font === f.id ? "on" : undefined} onClick={() => change({ font: f.id })}>
            <b style={f.display ? { fontFamily: f.display } : undefined}>Aa</b>
            <small>{f.label}</small>
          </button>
        ))}
      </div>

      <p className="ed-panel-title">Mode</p>
      <div className="ed-modes" role="radiogroup" aria-label="Light or dark">
        {MODES.map(m => (
          <button key={m.id} type="button" role="radio" aria-checked={current.mode === m.id} className={current.mode === m.id ? "on" : undefined} onClick={() => change({ mode: m.id })}>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Esc closes a toolbar panel. */
function usePanelDismiss(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);
}
