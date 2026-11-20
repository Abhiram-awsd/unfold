"use client";
/* eslint-disable @next/next/no-img-element -- user images come from storage at any size; plain <img> keeps templates portable */

import { useEffect, useState } from "react";
import { ContactForm } from "./ContactForm";
import { displayName, ed, firstName, initials, linkHost, repoMeta, resumeLabel, rootAttrs, track, UnfoldBadge, year, type TemplateProps } from "./shared";
import "./dark.css";

const SECTIONS = [
  { id: "about", label: "About" },
  { id: "work", label: "Work" },
  { id: "contact", label: "Contact" },
] as const;

/**
 * Dark: sticky identity panel on the left, scrolling content on the right.
 * The nav tracks the section in view; hovering a work card dims its siblings and lights the card under the cursor.
 */
export function Dark({ p }: TemplateProps) {
  const [active, setActive] = useState<string>("about");
  const hasAbout = !!p.bio || p.skills.length > 0 || p.education.length > 0;
  const hasContact = !!p.email || p.contact || !!p.resume_url;
  const sections = SECTIONS.filter(s => (s.id === "work" ? p.projects.length > 0 : s.id === "contact" ? hasContact : hasAbout));

  useEffect(() => {
    const els = sections.map(s => document.getElementById(`dk-${s.id}`)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id.replace("dk-", ""));
      },
      { rootMargin: "-30% 0px -55% 0px" },
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
    // Section list only changes with content, which is fixed for a page view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Spotlight: write the pointer position straight to the hovered card (no React state per frame).
  function onPointerMove(e: React.PointerEvent<HTMLOListElement>) {
    const card = (e.target as HTMLElement).closest<HTMLElement>(".dk-card");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--x", `${e.clientX - r.left}px`);
    card.style.setProperty("--y", `${e.clientY - r.top}px`);
  }

  return (
    <div className="dk" {...rootAttrs(p)}>
      <div className="dk-wrap">
        <header className="dk-side">
          <div className="dk-avatar" aria-hidden="true">
            {p.avatar_url ? <img src={p.avatar_url} alt="" width={56} height={56} /> : initials(p.name)}
          </div>
          <h1 className="dk-name" {...ed("name")}>{displayName(p.name)}</h1>
          {p.headline && <p className="dk-headline" {...ed("headline")}>{p.headline}</p>}
          {p.location && <p className="dk-loc" {...ed("location")}>{p.location}</p>}
          <nav className="dk-nav" aria-label="Sections">
            {sections.map(s => (
              <a key={s.id} href={`#dk-${s.id}`} className={active === s.id ? "on" : undefined} aria-current={active === s.id ? "true" : undefined}>
                <span className="dk-line" aria-hidden="true" />
                {s.label}
              </a>
            ))}
          </nav>
          {p.links.length > 0 && (
            <ul className="dk-social" aria-label="Links" {...ed("links")}>
              {p.links.map(l => <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer" {...track(`link:${l.url}`)}>{l.label}</a></li>)}
            </ul>
          )}
          {(p.email || p.contact) && (
            <a className="dk-cta" href={p.email ? `mailto:${p.email}` : "#dk-contact"} {...(p.email ? track("email") : {})}>
              Get in touch
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
            </a>
          )}
        </header>

        <main className="dk-main">
          {hasAbout && (
            <section id="dk-about" className="dk-section" aria-label="About">
              {p.bio && <p className="dk-bio" {...ed("bio")}>{p.bio}</p>}
              {p.skills.length > 0 && (
                <ul className="dk-skills" aria-label="Skills" {...ed("skills")}>
                  {p.skills.map(s => <li key={s}>{s}</li>)}
                </ul>
              )}
              {p.education.length > 0 && (
                <ul className="dk-edu" aria-label="Education" {...ed("education")}>
                  {p.education.map((e, i) => (
                    <li key={i}>
                      <span className="dk-period">{e.period}</span>
                      <span><b>{e.school}</b>{e.degree && <span> · {e.degree}</span>}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {p.projects.length > 0 && (
            <section id="dk-work" className="dk-section" aria-labelledby="dk-work-h">
              <h2 id="dk-work-h" className="dk-label">Selected work</h2>
              <ol className="dk-list" onPointerMove={onPointerMove}>
                {p.projects.map(pr => (
                  <li key={pr.id} className="dk-card">
                    <p className="dk-period" {...ed("project.period", pr.id)}>{pr.period}</p>
                    <div>
                      {pr.image_url && <img className="dk-shot" src={pr.image_url} alt={pr.title} loading="lazy" decoding="async" />}
                      <h3>
                        <span {...ed("project.title", pr.id)}>{pr.title}</span>
                        {pr.organization && <span className="dk-org"> · <span {...ed("project.organization", pr.id)}>{pr.organization}</span></span>}
                      </h3>
                      {pr.summary && <p className="dk-summary" {...ed("project.summary", pr.id)}>{pr.summary}</p>}
                      {pr.story && <p className="dk-story" {...ed("project.story", pr.id)}>{pr.story}</p>}
                      {(pr.link_url || repoMeta(pr)) && (
                        <p className="dk-proj-foot">
                          {pr.link_url && (
                            <a href={pr.link_url} target="_blank" rel="noopener noreferrer" {...track(`project:${pr.id}`)} {...ed("project.link_url", pr.id)}>
                              {linkHost(pr.link_url)} <span aria-hidden="true">↗</span>
                            </a>
                          )}
                          {repoMeta(pr) && <span>{repoMeta(pr)}</span>}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {hasContact && (
            <section id="dk-contact" className="dk-section dk-contact" aria-labelledby="dk-contact-h">
              <h2 id="dk-contact-h" className="dk-label">Contact</h2>
              <p className="dk-contact-line">Have a role or project in mind? <em>Let’s talk.</em></p>
              {p.email && <a className="dk-email" href={`mailto:${p.email}`} {...track("email")} {...ed("email")}>{p.email}</a>}
              {p.resume_url && (
                <p className="dk-resume"><a href={p.resume_url} {...track("resume")}>{resumeLabel(p.resume_url)}</a></p>
              )}
              {p.contact && <ContactForm portfolioId={p.id} firstName={p.name ? firstName(p.name) : ""} />}
            </section>
          )}

          <footer className="dk-foot">
            <span>© {year()} {displayName(p.name)}</span>
            <UnfoldBadge show={p.show_badge} className="dk-badge" />
          </footer>
        </main>
      </div>
    </div>
  );
}
