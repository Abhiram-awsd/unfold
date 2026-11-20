"use client";
/* eslint-disable @next/next/no-img-element -- user images come from storage at any size; plain <img> keeps templates portable */

import { useEffect, useRef, useState } from "react";
import { ContactForm } from "./ContactForm";
import { displayName, ed, fill, firstName, linkHost, meta, pad, repoMeta, resumeLabel, rootAttrs, track, UnfoldBadge, year, type TemplateProps } from "./shared";
import "./interactive.css";

/**
 * Interactive: motion with a job to do.
 *  - Hovering a work row shows a preview card that follows the cursor on a spring (fine pointers only).
 *  - Rows open into the case study, one at a time.
 *  - The contact button leans toward the cursor (magnetic), the skills scroll in a marquee.
 * Reduced motion: no springs, no marquee, no entrance.
 */
export function Interactive({ p }: TemplateProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const preview = useRef<HTMLDivElement>(null);
  const magnet = useRef<HTMLAnchorElement>(null);
  const name = displayName(p.name);
  const words = (p.headline || name).split(/\s+/).filter(Boolean);
  const marquee = fill(p.skills, 8); // short skill lists repeat so the strip never shows a gap

  // Cursor-following preview: a critically damped-ish spring toward the pointer, written straight to transform.
  useEffect(() => {
    const el = preview.current;
    if (!el || !matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tx = 0, ty = 0, x = 0, y = 0, vx = 0, vy = 0, raf = 0, started = false;
    const tick = () => {
      vx = (vx + (tx - x) * 0.12) * 0.72;
      vy = (vy + (ty - y) * 0.12) * 0.72;
      x += vx; y += vy;
      el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(vx) + Math.abs(vy) > 0.1 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      tx = e.clientX + 24; ty = e.clientY - 80;
      if (!started) { x = tx; y = ty; started = true; } // first frame: appear at the cursor, don't fly in from 0,0
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);

  // Magnetic button: pulls up to 30% of the distance toward the cursor while it's within 120px.
  useEffect(() => {
    const el = magnet.current;
    if (!el || !matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tx = 0, ty = 0, x = 0, y = 0, vx = 0, vy = 0, raf = 0;
    const tick = () => {
      vx = (vx + (tx - x) * 0.15) * 0.75;
      vy = (vy + (ty - y) * 0.15) * 0.75;
      x += vx; y += vy;
      el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(vx) + Math.abs(vy) > 0.05 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const near = Math.hypot(dx, dy) < 120 + r.width / 2;
      tx = near ? dx * 0.3 : 0; ty = near ? dy * 0.3 : 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);

  const shown = hovered === null ? null : p.projects[hovered];
  const hasContact = !!p.email || p.links.length > 0 || p.contact || !!p.resume_url;

  return (
    <div className="ix" {...rootAttrs(p)}>
      <header className="ix-wrap ix-top">
        <span className="ix-id">
          {p.avatar_url && <img className="ix-avatar" src={p.avatar_url} alt="" width={32} height={32} />}
          <span className="ix-name" {...ed("name")}>{name}</span>
        </span>
        {p.location && <span className="ix-status" {...ed("location")}><i aria-hidden="true" />{p.location}</span>}
      </header>

      <main>
        <section className="ix-wrap ix-hero" aria-label="Introduction">
          <h1 aria-label={p.headline || name} {...ed(p.headline ? "headline" : "name")}>
            {words.map((w, i) => (
              <span key={i} className="ix-word" style={{ "--i": i } as React.CSSProperties} aria-hidden="true">{w}</span>
            ))}
          </h1>
          {p.bio && <p className="ix-bio" {...ed("bio")}>{p.bio}</p>}
        </section>

        {p.skills.length > 0 && (
          <div className="ix-marquee" aria-label="Skills" {...ed("skills")}>
            <ul className="ix-track">
              {[0, 1].map(copy =>
                marquee.map((s, i) => (
                  <li key={`${copy}-${i}`} aria-hidden={copy === 1 || i >= p.skills.length ? true : undefined}>
                    {s}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 0l1.4 4.6L12 6l-4.6 1.4L6 12l-1.4-4.6L0 6l4.6-1.4z" /></svg>
                  </li>
                )),
              )}
            </ul>
          </div>
        )}

        {p.projects.length > 0 && (
          <section className="ix-wrap ix-work" aria-labelledby="ix-work-h">
            <h2 id="ix-work-h" className="ix-label">Selected work <span>({pad(p.projects.length)})</span></h2>
            <ol className="ix-list" onPointerLeave={() => setHovered(null)}>
              {p.projects.map((pr, i) => {
                const isOpen = open === pr.id;
                return (
                  <li key={pr.id} className={`ix-row${isOpen ? " open" : ""}`} onPointerEnter={() => setHovered(isOpen ? null : i)}>
                    <button
                      type="button"
                      className="ix-head"
                      aria-expanded={isOpen}
                      aria-controls={`ix-story-${pr.id}`}
                      onClick={() => { setOpen(isOpen ? null : pr.id); setHovered(null); }}
                    >
                      <span className="ix-num">{pad(i + 1)}</span>
                      <span className="ix-title" {...ed("project.title", pr.id)}>{pr.title}</span>
                      <span className="ix-meta">
                        {pr.organization && <span {...ed("project.organization", pr.id)}>{pr.organization}</span>}
                        {pr.organization && pr.period && " · "}
                        {pr.period && <span {...ed("project.period", pr.id)}>{pr.period}</span>}
                      </span>
                      <span className="ix-toggle" aria-hidden="true" />
                    </button>
                    <div className="ix-story" id={`ix-story-${pr.id}`} role="region" aria-label={pr.title}>
                      <div>
                        {pr.image_url ? (
                          <div className="ix-cover ix-cover-img"><img src={pr.image_url} alt={pr.title} loading="lazy" decoding="async" /></div>
                        ) : (
                          <div className={`ix-cover ix-cover-${i % 4}`} aria-hidden="true"><span>{pr.title}</span></div>
                        )}
                        <div className="ix-text">
                          {pr.summary && <p className="ix-summary" {...ed("project.summary", pr.id)}>{pr.summary}</p>}
                          {pr.story && <p {...ed("project.story", pr.id)}>{pr.story}</p>}
                          {(pr.link_url || repoMeta(pr)) && (
                            <p className="ix-proj-foot">
                              {pr.link_url && (
                                <a className="ix-visit" href={pr.link_url} target="_blank" rel="noopener noreferrer" {...track(`project:${pr.id}`)} {...ed("project.link_url", pr.id)}>
                                  {linkHost(pr.link_url)}<span aria-hidden="true">↗</span>
                                </a>
                              )}
                              {repoMeta(pr) && <span>{repoMeta(pr)}</span>}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {p.education.length > 0 && (
          <section className="ix-wrap ix-edu" aria-labelledby="ix-edu-h">
            <h2 id="ix-edu-h" className="ix-label">Education</h2>
            <ul {...ed("education")}>
              {p.education.map((e, i) => (
                <li key={i}>
                  <b>{e.school}</b>
                  <span>{meta(e.degree, e.period)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {hasContact && (
          <section id="contact" className="ix-wrap ix-contact" aria-labelledby="ix-contact-h">
            <h2 id="ix-contact-h">Got a project? <span>Let’s talk.</span></h2>
            {p.email && (
              <>
                <a ref={magnet} className="ix-magnet" href={`mailto:${p.email}`} {...track("email")}>
                  <span>{p.name ? `Email ${firstName(p.name)}` : "Send an email"}</span>
                </a>
                <p className="ix-email" {...ed("email")}>{p.email}</p>
              </>
            )}
            {(p.links.length > 0 || p.resume_url) && (
              <ul className="ix-links" aria-label="Links" {...ed("links")}>
                {p.links.map(l => <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer" {...track(`link:${l.url}`)}>{l.label}<span aria-hidden="true">↗</span></a></li>)}
                {p.resume_url && <li><a href={p.resume_url} {...track("resume")}>{resumeLabel(p.resume_url)}<span aria-hidden="true">↓</span></a></li>}
              </ul>
            )}
            {p.contact && <ContactForm portfolioId={p.id} firstName={p.name ? firstName(p.name) : ""} />}
          </section>
        )}
      </main>

      <footer className="ix-wrap ix-foot">
        <span>© {year()} {name}</span>
        <UnfoldBadge show={p.show_badge} className="ix-badge" />
      </footer>

      {/* Cursor preview: decorative, hidden from assistive tech. */}
      <div ref={preview} className={`ix-preview${shown ? " show" : ""}`} aria-hidden="true">
        {p.projects.map((pr, i) => (
          <div
            key={pr.id}
            className={`ix-preview-card ${pr.image_url ? "ix-preview-img" : `ix-cover-${i % 4}`}${hovered === i ? " on" : ""}`}
            style={pr.image_url ? ({ "--img": `url("${pr.image_url.replace(/"/g, "%22")}")` } as React.CSSProperties) : undefined}
          >
            <b>{pr.title}</b>
            {pr.summary && <small>{pr.summary}</small>}
          </div>
        ))}
      </div>
    </div>
  );
}
