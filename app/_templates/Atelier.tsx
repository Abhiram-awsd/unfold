/* eslint-disable @next/next/no-img-element -- user images come from storage at any size; plain <img> keeps templates portable */
import { ContactForm } from "./ContactForm";
import { Stage } from "./Stage";
import { displayName, ed, firstName, initials, linkHost, repoMeta, resumeLabel, rootAttrs, track, UnfoldBadge, year, type TemplateProps } from "./shared";
import "./atelier.css";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const roman = (i: number) => ROMAN[i] ?? String(i + 1);

/**
 * Atelier (premium, classic): warm paper, serif display type and work shown as printed plates.
 * The hero is a fanned stack of plates in real 3D that leans toward the cursor; each project
 * below is a framed plate that tilts, with its sheet lifted off the mat.
 */
export function Atelier({ p }: TemplateProps) {
  const name = displayName(p.name);
  const stack = p.projects.slice(0, 3);
  const hasContact = !!p.email || p.links.length > 0 || p.contact || !!p.resume_url;
  return (
    <div className="at" {...rootAttrs(p)}>
      <header className="at-wrap at-top">
        <span className="at-id">
          {p.avatar_url ? <img className="at-avatar" src={p.avatar_url} alt="" width={36} height={36} /> : <i className="at-mono" aria-hidden="true">{initials(name)}</i>}
          <span {...ed("name")}>{name}</span>
        </span>
        <nav aria-label="Sections">
          {p.projects.length > 0 && <a href="#at-work">Work</a>}
          {(p.bio || p.skills.length > 0) && <a href="#at-about">About</a>}
          {hasContact && <a href="#at-contact">Contact</a>}
        </nav>
      </header>

      <main>
        <Stage className="at-wrap at-hero" max={7}>
          <div className="at-hero-text">
            {p.location && <p className="at-kicker" {...ed("location")}>{p.location}</p>}
            <h1 {...ed(p.headline ? "headline" : "name")}>{p.headline || name}</h1>
            <p className="at-cta">
              {p.projects.length > 0 && <a className="at-btn" href="#at-work">View the work</a>}
              {p.resume_url && <a className="at-link" href={p.resume_url} {...track("resume")}>{resumeLabel(p.resume_url)}</a>}
            </p>
          </div>
          <div className="at-stack" aria-hidden="true">
            {(stack.length ? stack : [null]).map((pr, i, all) => (
              <div key={pr?.id ?? "m"} className="at-sheet" style={{ "--i": i, "--n": all.length } as React.CSSProperties}>
                {pr?.image_url ? <img src={pr.image_url} alt="" /> : <span className="at-sheet-mark">{pr ? roman(i) : initials(name)}</span>}
                <span className="at-sheet-cap">{pr ? pr.title : name}</span>
              </div>
            ))}
          </div>
        </Stage>

        {p.projects.length > 0 && (
          <section id="at-work" className="at-wrap at-section" aria-labelledby="at-work-h">
            <h2 id="at-work-h" className="at-h2"><span>Selected</span> work</h2>
            <ol className="at-plates">
              {p.projects.map((pr, i) => (
                <li key={pr.id} className="at-plate">
                  <Stage className="at-frame" max={9}>
                    <div className="at-mat">
                      {pr.image_url ? <img className="at-print" src={pr.image_url} alt={pr.title} loading="lazy" decoding="async" /> : <div className="at-print at-print-gen" aria-hidden="true"><span>{roman(i)}</span></div>}
                    </div>
                  </Stage>
                  <div className="at-plate-text">
                    <p className="at-no">Plate {roman(i)}{pr.period && <> · <span {...ed("project.period", pr.id)}>{pr.period}</span></>}</p>
                    <h3 {...ed("project.title", pr.id)}>{pr.title}</h3>
                    {pr.organization && <p className="at-org" {...ed("project.organization", pr.id)}>{pr.organization}</p>}
                    {pr.summary && <p className="at-summary" {...ed("project.summary", pr.id)}>{pr.summary}</p>}
                    {pr.story && <p className="at-story" {...ed("project.story", pr.id)}>{pr.story}</p>}
                    {(pr.link_url || repoMeta(pr)) && (
                      <p className="at-foot">
                        {pr.link_url && <a className="at-link" href={pr.link_url} target="_blank" rel="noopener noreferrer" {...track(`project:${pr.id}`)} {...ed("project.link_url", pr.id)}>{linkHost(pr.link_url)} ↗</a>}
                        {repoMeta(pr) && <span>{repoMeta(pr)}</span>}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {(p.bio || p.skills.length > 0 || p.education.length > 0) && (
          <section id="at-about" className="at-wrap at-section at-about" aria-labelledby="at-about-h">
            <h2 id="at-about-h" className="at-h2"><span>About</span> {p.name ? firstName(p.name) : "me"}</h2>
            <div className="at-cols">
              {p.bio && <p className="at-bio" {...ed("bio")}>{p.bio}</p>}
              <div className="at-side">
                {p.skills.length > 0 && (
                  <div>
                    <h3 className="at-label">Practice</h3>
                    <ul className="at-skills" {...ed("skills")}>{p.skills.map(s => <li key={s}>{s}</li>)}</ul>
                  </div>
                )}
                {p.education.length > 0 && (
                  <div>
                    <h3 className="at-label">Education</h3>
                    <ul className="at-edu" {...ed("education")}>
                      {p.education.map((e, i) => <li key={i}><b>{e.school}</b>{(e.degree || e.period) && <span>{[e.degree, e.period].filter(Boolean).join(" · ")}</span>}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {hasContact && (
          <section id="at-contact" className="at-wrap at-section at-contact" aria-labelledby="at-contact-h">
            <h2 id="at-contact-h" className="at-h2"><span>Write</span> to me</h2>
            {p.email && <a className="at-email" href={`mailto:${p.email}`} {...track("email")} {...ed("email")}>{p.email}</a>}
            {(p.links.length > 0 || p.resume_url) && (
              <p className="at-links" {...ed("links")}>
                {p.links.map(l => <a key={l.url} className="at-link" href={l.url} target="_blank" rel="noopener noreferrer" {...track(`link:${l.url}`)}>{l.label} ↗</a>)}
                {p.resume_url && <a className="at-link" href={p.resume_url} {...track("resume")}>{resumeLabel(p.resume_url)}</a>}
              </p>
            )}
            {p.contact && <ContactForm portfolioId={p.id} firstName={p.name ? firstName(p.name) : ""} />}
          </section>
        )}
      </main>

      <footer className="at-wrap at-end">
        <span>© {year()} {name}</span>
        <UnfoldBadge show={p.show_badge} className="at-badge" />
      </footer>
    </div>
  );
}
