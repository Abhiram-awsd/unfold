/* eslint-disable @next/next/no-img-element -- user images come from storage at any size; plain <img> keeps templates portable */
import { ContactForm } from "./ContactForm";
import { displayName, ed, firstName, linkHost, meta, repoMeta, resumeLabel, rootAttrs, track, UnfoldBadge, year, type TemplateProps } from "./shared";
import "./minimal.css";

/**
 * Minimal: one narrow column, light ground, typography only.
 * Case studies sit inside native <details>, so they work without JavaScript and open with a short height transition.
 */
export function Minimal({ p }: TemplateProps) {
  const name = displayName(p.name);
  const hasContact = !!p.email || p.links.length > 0 || p.contact; // the résumé link lives in the hero
  return (
    <div className="mn" {...rootAttrs(p)}>
      <header className="mn-col mn-top mn-in" style={{ "--i": 0 } as React.CSSProperties}>
        <span className="mn-id">
          {p.avatar_url && <img className="mn-avatar" src={p.avatar_url} alt="" width={28} height={28} />}
          <span className="mn-name" {...ed("name")}>{name}</span>
        </span>
        {p.location && <span className="mn-muted" {...ed("location")}>{p.location}</span>}
      </header>

      <main className="mn-col">
        <section className="mn-hero mn-in" style={{ "--i": 1 } as React.CSSProperties}>
          <h1 {...ed(p.headline ? "headline" : "name")}>{p.headline || name}</h1>
          <p className="mn-links">
            {p.projects.length > 0 && <a href="#work">Selected work</a>}
            {p.email && <a href={`mailto:${p.email}`} {...track("email")}>Email me</a>}
            {!p.email && p.contact && <a href="#contact">Get in touch</a>}
            {p.resume_url && <a href={p.resume_url} {...track("resume")}>{resumeLabel(p.resume_url)}</a>}
          </p>
        </section>

        {p.projects.length > 0 && (
          <section id="work" className="mn-section mn-in" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="mn-work">
            <h2 id="mn-work" className="mn-label">Work</h2>
            <ul className="mn-work">
              {p.projects.map(pr => (
                <li key={pr.id}>
                  <details className="mn-item">
                    <summary>
                      <span className="mn-period" {...ed("project.period", pr.id)}>{pr.period}</span>
                      <span className="mn-title">
                        <b {...ed("project.title", pr.id)}>{pr.title}</b>
                        {pr.organization && <span className="mn-muted" {...ed("project.organization", pr.id)}>{pr.organization}</span>}
                      </span>
                      <span className="mn-plus" aria-hidden="true" />
                    </summary>
                    <div className="mn-body">
                      {pr.image_url && <img className="mn-shot" src={pr.image_url} alt={pr.title} loading="lazy" decoding="async" />}
                      {pr.summary && <p className="mn-summary" {...ed("project.summary", pr.id)}>{pr.summary}</p>}
                      {pr.story && <p {...ed("project.story", pr.id)}>{pr.story}</p>}
                      {(pr.link_url || repoMeta(pr)) && (
                        <p className="mn-proj-foot">
                          {pr.link_url && <a className="mn-visit" href={pr.link_url} target="_blank" rel="noopener noreferrer" {...track(`project:${pr.id}`)} {...ed("project.link_url", pr.id)}>{linkHost(pr.link_url)} ↗</a>}
                          {repoMeta(pr) && <span>{repoMeta(pr)}</span>}
                        </p>
                      )}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        )}

        {p.education.length > 0 && (
          <section className="mn-section mn-in" style={{ "--i": 3 } as React.CSSProperties} aria-labelledby="mn-edu">
            <h2 id="mn-edu" className="mn-label">Education</h2>
            <ul className="mn-edu" {...ed("education")}>
              {p.education.map((e, i) => (
                <li key={i}>
                  <span className="mn-period">{e.period}</span>
                  <span className="mn-title"><b>{e.school}</b>{e.degree && <span className="mn-muted">{e.degree}</span>}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(p.bio || p.skills.length > 0) && (
          <section className="mn-section mn-in" style={{ "--i": 3 } as React.CSSProperties} aria-labelledby="mn-about">
            <h2 id="mn-about" className="mn-label">About</h2>
            <div className="mn-about">
              {p.bio && <p {...ed("bio")}>{p.bio}</p>}
              {p.skills.length > 0 && <p className="mn-muted" {...ed("skills")}>{p.skills.join(", ")}</p>}
            </div>
          </section>
        )}

        {hasContact && (
          <section id="contact" className="mn-section mn-in" style={{ "--i": 4 } as React.CSSProperties} aria-labelledby="mn-contact">
            <h2 id="mn-contact" className="mn-label">Contact</h2>
            <div className="mn-contact">
              {p.email && <a className="mn-email" href={`mailto:${p.email}`} {...track("email")} {...ed("email")}>{p.email}</a>}
              {p.links.length > 0 && (
                <p className="mn-links mn-links-list" {...ed("links")}>
                  {p.links.map(l => <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" {...track(`link:${l.url}`)}>{l.label} ↗</a>)}
                </p>
              )}
              {p.contact && <ContactForm portfolioId={p.id} firstName={p.name ? firstName(p.name) : ""} />}
            </div>
          </section>
        )}
      </main>

      <footer className="mn-col mn-foot">
        <span>© {year()} {meta(name)}</span>
        <UnfoldBadge show={p.show_badge} className="mn-badge" />
      </footer>
    </div>
  );
}
