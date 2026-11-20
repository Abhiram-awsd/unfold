/* eslint-disable @next/next/no-img-element -- user images come from storage at any size; plain <img> keeps templates portable */
import { ContactForm } from "./ContactForm";
import { Stage } from "./Stage";
import { displayName, ed, firstName, initials, linkHost, pad, repoMeta, resumeLabel, rootAttrs, track, UnfoldBadge, year, type TemplateProps } from "./shared";
import "./prism.css";

/**
 * Prism (premium, modern): glass on a dark ground, lit by two colours.
 * The hero is a 3D scene: floating glass slabs that lean toward the cursor, with the person's
 * skills orbiting them on a ring. Project cards tilt and catch a moving highlight.
 */
export function Prism({ p }: TemplateProps) {
  const name = displayName(p.name);
  const ring = p.skills.slice(0, 10);
  const hasContact = !!p.email || p.links.length > 0 || p.contact || !!p.resume_url;
  return (
    <div className="pz" {...rootAttrs(p)}>
      <header className="pz-wrap pz-top">
        <span className="pz-id" {...ed("name")}>{name}</span>
        <nav aria-label="Sections">
          {p.projects.length > 0 && <a href="#pz-work">Work</a>}
          {p.education.length > 0 && <a href="#pz-about">Education</a>}
          {hasContact && <a className="pz-pill" href="#pz-contact">Contact</a>}
        </nav>
      </header>

      <main>
        <Stage className="pz-wrap pz-hero" max={10}>
          <div className="pz-hero-text">
            {p.location && <p className="pz-kicker" {...ed("location")}><i aria-hidden="true" />{p.location}</p>}
            <h1 {...ed(p.headline ? "headline" : "name")}>{p.headline || name}</h1>
            {p.bio && <p className="pz-lede" {...ed("bio")}>{p.bio}</p>}
            <p className="pz-cta">
              {p.projects.length > 0 && <a className="pz-btn" href="#pz-work">See the work</a>}
              {p.resume_url && <a className="pz-btn pz-btn-ghost" href={p.resume_url} {...track("resume")}>{resumeLabel(p.resume_url)}</a>}
            </p>
          </div>
          <div className="pz-scene" aria-hidden="true">
            <div className="pz-rig">
              <span className="pz-orb pz-orb-a" />
              <span className="pz-orb pz-orb-b" />
              <div className="pz-slab pz-slab-back" />
              <div className="pz-slab pz-slab-mid" />
              <div className="pz-slab pz-slab-front">
                {p.avatar_url ? <img src={p.avatar_url} alt="" /> : <b>{initials(name)}</b>}
                <span>{name}</span>
                <small>{p.projects.length > 0 ? `${p.projects.length} project${p.projects.length === 1 ? "" : "s"}` : "Portfolio"}</small>
              </div>
              {ring.length > 2 && (
                <div className="pz-ring" style={{ "--n": ring.length } as React.CSSProperties}>
                  {ring.map((s, i) => <span key={s} style={{ "--i": i } as React.CSSProperties}><b>{s}</b></span>)}
                </div>
              )}
            </div>
          </div>
        </Stage>

        {p.skills.length > 0 && (
          <ul className="pz-wrap pz-skills" aria-label="Skills" {...ed("skills")}>{p.skills.map(s => <li key={s}>{s}</li>)}</ul>
        )}

        {p.projects.length > 0 && (
          <section id="pz-work" className="pz-wrap pz-section" aria-labelledby="pz-work-h">
            <h2 id="pz-work-h" className="pz-h2">Selected work</h2>
            <div className="pz-grid">
              {p.projects.map((pr, i) => (
                <Stage key={pr.id} className={`pz-tilt${i === p.projects.length - 1 && i % 2 === 0 ? " pz-wide" : ""}`} max={6}>
                  <article className="pz-card">
                    <div className={`pz-cover pz-cover-${i % 3}`}>
                      {pr.image_url ? <img src={pr.image_url} alt={pr.title} loading="lazy" decoding="async" /> : <span aria-hidden="true">{pad(i + 1)}</span>}
                    </div>
                    <div className="pz-body">
                      {(pr.organization || pr.period) && (
                        <p className="pz-meta">
                          {pr.organization && <span {...ed("project.organization", pr.id)}>{pr.organization}</span>}
                          {pr.organization && pr.period && " · "}
                          {pr.period && <span {...ed("project.period", pr.id)}>{pr.period}</span>}
                        </p>
                      )}
                      <h3 {...ed("project.title", pr.id)}>{pr.title}</h3>
                      {pr.summary && <p className="pz-summary" {...ed("project.summary", pr.id)}>{pr.summary}</p>}
                      {pr.story && <p className="pz-story" {...ed("project.story", pr.id)}>{pr.story}</p>}
                      {(pr.link_url || repoMeta(pr)) && (
                        <p className="pz-foot">
                          {pr.link_url && <a className="pz-visit" href={pr.link_url} target="_blank" rel="noopener noreferrer" {...track(`project:${pr.id}`)} {...ed("project.link_url", pr.id)}>{linkHost(pr.link_url)} ↗</a>}
                          {repoMeta(pr) && <span>{repoMeta(pr)}</span>}
                        </p>
                      )}
                    </div>
                    <span className="pz-glare" aria-hidden="true" />
                  </article>
                </Stage>
              ))}
            </div>
          </section>
        )}

        {p.education.length > 0 && (
          <section id="pz-about" className="pz-wrap pz-section" aria-labelledby="pz-edu-h">
            <h2 id="pz-edu-h" className="pz-h2">Education</h2>
            <ul className="pz-edu" {...ed("education")}>
              {p.education.map((e, i) => <li key={i} className="pz-glass"><b>{e.school}</b>{e.degree && <span>{e.degree}</span>}{e.period && <small>{e.period}</small>}</li>)}
            </ul>
          </section>
        )}

        {hasContact && (
          <section id="pz-contact" className="pz-wrap pz-section" aria-labelledby="pz-contact-h">
            <div className="pz-glass pz-contact">
              <div>
                <h2 id="pz-contact-h" className="pz-h2">Let’s build something.</h2>
                {p.email && <a className="pz-email" href={`mailto:${p.email}`} {...track("email")} {...ed("email")}>{p.email}</a>}
                {(p.links.length > 0 || p.resume_url) && (
                  <p className="pz-links" {...ed("links")}>
                    {p.links.map(l => <a key={l.url} className="pz-btn pz-btn-ghost" href={l.url} target="_blank" rel="noopener noreferrer" {...track(`link:${l.url}`)}>{l.label}</a>)}
                  </p>
                )}
              </div>
              {p.contact && <ContactForm portfolioId={p.id} firstName={p.name ? firstName(p.name) : ""} />}
            </div>
          </section>
        )}
      </main>

      <footer className="pz-wrap pz-end">
        <span>© {year()} {name}</span>
        <UnfoldBadge show={p.show_badge} className="pz-badge" />
      </footer>
    </div>
  );
}
