/* eslint-disable @next/next/no-img-element -- user images come from storage at any size; plain <img> keeps templates portable */
import { ContactForm } from "./ContactForm";
import { CopyEmail } from "./CopyEmail";
import { displayName, ed, firstName, initials, linkHost, repoMeta, resumeLabel, rootAttrs, track, UnfoldBadge, year, type TemplateProps } from "./shared";
import "./modern.css";

/**
 * Modern: a bento grid. Identity and contact share the first row, then whichever of
 * experience, skills, education and links the resume has are packed two per row
 * (alternating 5/7 widths), then one card per project. Odd leftovers go full width,
 * so the grid never shows holes whatever the resume contains.
 */
export function Modern({ p }: TemplateProps) {
  const name = displayName(p.name);
  const timeline = p.projects.filter(pr => pr.organization).slice(0, 5);
  const hasContactCard = !!p.email || !!p.resume_url;
  let i = 0;
  const next = () => ({ "--i": i++ }) as React.CSSProperties;

  const small: Array<{ key: string; node: React.ReactNode; edit?: string }> = [];
  if (timeline.length) small.push({ key: "exp", node: (
    <>
      <h2 className="md-label">Experience</h2>
      <ol className="md-list">
        {timeline.map(pr => <li key={pr.id}><b>{pr.organization}</b><span>{pr.period}</span></li>)}
      </ol>
    </>
  ) });
  if (p.skills.length) small.push({ key: "skills", edit: "skills", node: (
    <>
      <h2 className="md-label">Skills</h2>
      <ul className="md-chips">{p.skills.map(s => <li key={s}>{s}</li>)}</ul>
    </>
  ) });
  if (p.education.length) small.push({ key: "edu", edit: "education", node: (
    <>
      <h2 className="md-label">Education</h2>
      <ol className="md-list">
        {p.education.map((e, n) => <li key={n}><span className="md-edu"><b>{e.school}</b>{e.degree && <small>{e.degree}</small>}</span><span>{e.period}</span></li>)}
      </ol>
    </>
  ) });
  if (p.links.length) small.push({ key: "links", edit: "links", node: (
    <>
      <h2 className="md-label">Elsewhere</h2>
      <ul className="md-linklist">
        {p.links.map(l => (
          <li key={l.url}>
            <a href={l.url} target="_blank" rel="noopener noreferrer" {...track(`link:${l.url}`)}>
              {l.label}
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M5 11l6-6M6 5h5v5" /></svg>
            </a>
          </li>
        ))}
      </ul>
    </>
  ) });
  const spanFor = (n: number) => (n === small.length - 1 && n % 2 === 0 ? "md-s12" : (Math.floor(n / 2) % 2 === 0) === (n % 2 === 0) ? "md-s5" : "md-s7");

  return (
    <div className="md" {...rootAttrs(p)}>
      <div className="md-wrap">
        <header className="md-top">
          <span className="md-logo">
            {p.avatar_url ? <img className="md-avatar" src={p.avatar_url} alt="" width={32} height={32} /> : <i aria-hidden="true">{initials(name)}</i>}
            <span {...ed("name")}>{name}</span>
          </span>
          {p.email ? (
            <a className="md-pill" href={`mailto:${p.email}`} {...track("email")}>Contact</a>
          ) : p.contact ? (
            <a className="md-pill" href="#contact">Contact</a>
          ) : null}
        </header>

        <main className="md-grid">
          <section className={`md-card md-intro${hasContactCard ? "" : " md-s12"}`} style={next()} aria-label="Introduction">
            {p.location && <p className="md-kicker" {...ed("location")}><span className="md-dot" aria-hidden="true" />{p.location}</p>}
            <h1 {...ed(p.headline ? "headline" : "name")}>{p.headline || name}</h1>
            {p.bio && <p className="md-bio" {...ed("bio")}>{p.bio}</p>}
          </section>

          {hasContactCard && (
            <section className="md-card md-contact" style={next()} aria-labelledby="md-contact-h">
              <h2 id="md-contact-h">{p.email ? "Let’s work together" : "My résumé"}</h2>
              {p.email && <p className="md-email" {...ed("email")}>{p.email}</p>}
              <div className="md-actions">
                {p.email && <a className="md-btn md-btn-light" href={`mailto:${p.email}`} {...track("email")}>Send an email</a>}
                {p.email && <CopyEmail email={p.email} className="md-btn md-btn-ghost" />}
                {p.resume_url && <a className={`md-btn ${p.email ? "md-btn-ghost" : "md-btn-light"}`} href={p.resume_url} {...track("resume")}>{resumeLabel(p.resume_url)}</a>}
              </div>
            </section>
          )}

          {small.map((c, n) => (
            <section key={c.key} className={`md-card md-small ${spanFor(n)}`} style={next()} {...(c.edit ? ed(c.edit) : {})}>
              {c.node}
            </section>
          ))}

          {p.projects.length > 0 && <h2 className="md-section" style={next()}>Selected work</h2>}

          {p.projects.map((pr, n) => (
            <article key={pr.id} className={`md-card md-project${n === p.projects.length - 1 && n % 2 === 0 ? " md-wide" : ""}`} style={next()}>
              {pr.image_url ? (
                <div className="md-cover md-cover-img"><img src={pr.image_url} alt={pr.title} loading="lazy" decoding="async" /></div>
              ) : (
                <div className={`md-cover md-cover-${n % 4}`} aria-hidden="true">
                  <div className="md-mock"><span /><span /><span /></div>
                </div>
              )}
              <div className="md-project-body">
                {(pr.organization || pr.period) && (
                  <p className="md-meta">
                    {pr.organization && <span {...ed("project.organization", pr.id)}>{pr.organization}</span>}
                    {pr.organization && pr.period && " · "}
                    {pr.period && <span {...ed("project.period", pr.id)}>{pr.period}</span>}
                  </p>
                )}
                <h3 {...ed("project.title", pr.id)}>{pr.title}</h3>
                {pr.summary && <p className="md-summary" {...ed("project.summary", pr.id)}>{pr.summary}</p>}
                {pr.story && <p className="md-story" {...ed("project.story", pr.id)}>{pr.story}</p>}
                {(pr.link_url || repoMeta(pr)) && (
                  <p className="md-proj-foot">
                    {pr.link_url && (
                      <a className="md-visit" href={pr.link_url} target="_blank" rel="noopener noreferrer" {...track(`project:${pr.id}`)} {...ed("project.link_url", pr.id)}>
                        {linkHost(pr.link_url)}
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M5 11l6-6M6 5h5v5" /></svg>
                      </a>
                    )}
                    {repoMeta(pr) && <span>{repoMeta(pr)}</span>}
                  </p>
                )}
              </div>
            </article>
          ))}

          {p.contact && (
            <section id="contact" className="md-card md-form" style={next()} aria-labelledby="md-form-h">
              <div className="md-form-head">
                <h2 id="md-form-h">Send a message</h2>
                <p>{p.name ? `It goes straight to ${firstName(p.name)}.` : "It goes straight to my inbox."}</p>
              </div>
              <ContactForm portfolioId={p.id} firstName={p.name ? firstName(p.name) : ""} />
            </section>
          )}
        </main>

        <footer className="md-foot">
          <span>© {year()} {name}</span>
          <UnfoldBadge show={p.show_badge} className="md-badge" />
        </footer>
      </div>
    </div>
  );
}
