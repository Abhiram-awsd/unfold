/* eslint-disable @next/next/no-img-element -- user images come from storage at any size; plain <img> keeps templates portable */
import { ContactForm } from "./ContactForm";
import { Stage } from "./Stage";
import { displayName, ed, firstName, initials, linkHost, pad, repoMeta, resumeLabel, rootAttrs, track, UnfoldBadge, year, type TemplateProps } from "./shared";
import "./mono.css";

/**
 * Mono (premium, minimal): one typeface, one accent, hairlines, and a single 3D object.
 * The hairline cube in the hero turns slowly on its own, leans toward the cursor and
 * rotates as the page scrolls. Everything else stays still and quiet.
 */
export function Mono({ p }: TemplateProps) {
  const name = displayName(p.name);
  const hasContact = !!p.email || p.links.length > 0 || p.contact;
  return (
    <div className="mo" {...rootAttrs(p)}>
      <header className="mo-wrap mo-top">
        <span className="mo-id">
          {p.avatar_url && <img className="mo-avatar" src={p.avatar_url} alt="" width={24} height={24} />}
          <span {...ed("name")}>{name}</span>
        </span>
        {p.location && <span className="mo-dim" {...ed("location")}>{p.location}</span>}
        <span className="mo-dim mo-year">{year()}</span>
      </header>

      <main>
        <Stage className="mo-wrap mo-hero" max={18} scroll>
          <div>
            <h1 {...ed(p.headline ? "headline" : "name")}>{p.headline || name}</h1>
            <p className="mo-cta">
              {p.projects.length > 0 && <a href="#mo-work">Work <span aria-hidden="true">↓</span></a>}
              {p.email ? <a href={`mailto:${p.email}`} {...track("email")}>Email</a> : p.contact && <a href="#mo-contact">Contact</a>}
              {p.resume_url && <a href={p.resume_url} {...track("resume")}>{resumeLabel(p.resume_url)}</a>}
            </p>
          </div>
          <div className="mo-scene" aria-hidden="true">
            <div className="mo-spin">
              <div className="mo-cube">
                <i /><i /><i /><i /><i /><i>{initials(name)}</i>
                <div className="mo-core"><i /><i /><i /><i /><i /><i /></div>
              </div>
            </div>
          </div>
        </Stage>

        {p.projects.length > 0 && (
          <section id="mo-work" className="mo-wrap mo-section" aria-labelledby="mo-work-h">
            <h2 id="mo-work-h" className="mo-label">Work <span>({pad(p.projects.length)})</span></h2>
            <ol className="mo-list">
              {p.projects.map((pr, i) => (
                <li key={pr.id} className="mo-row">
                  <span className="mo-n">{pad(i + 1)}</span>
                  <div className="mo-main">
                    <h3 {...ed("project.title", pr.id)}>{pr.title}</h3>
                    {(pr.organization || pr.period) && (
                      <p className="mo-dim">
                        {pr.organization && <span {...ed("project.organization", pr.id)}>{pr.organization}</span>}
                        {pr.organization && pr.period && ", "}
                        {pr.period && <span {...ed("project.period", pr.id)}>{pr.period}</span>}
                      </p>
                    )}
                    {pr.image_url && (
                      <Stage className="mo-shot" max={7}><img src={pr.image_url} alt={pr.title} loading="lazy" decoding="async" /></Stage>
                    )}
                  </div>
                  <div className="mo-text">
                    {pr.summary && <p {...ed("project.summary", pr.id)}>{pr.summary}</p>}
                    {pr.story && <p className="mo-dim" {...ed("project.story", pr.id)}>{pr.story}</p>}
                    {(pr.link_url || repoMeta(pr)) && (
                      <p className="mo-foot">
                        {pr.link_url && <a href={pr.link_url} target="_blank" rel="noopener noreferrer" {...track(`project:${pr.id}`)} {...ed("project.link_url", pr.id)}>{linkHost(pr.link_url)} ↗</a>}
                        {repoMeta(pr) && <span className="mo-dim">{repoMeta(pr)}</span>}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {(p.bio || p.skills.length > 0 || p.education.length > 0) && (
          <section className="mo-wrap mo-section" aria-labelledby="mo-about-h">
            <h2 id="mo-about-h" className="mo-label">About</h2>
            <div className="mo-about">
              {p.bio && <p className="mo-bio" {...ed("bio")}>{p.bio}</p>}
              {p.skills.length > 0 && <p className="mo-dim" {...ed("skills")}>{p.skills.join(" / ")}</p>}
              {p.education.length > 0 && (
                <ul className="mo-edu" {...ed("education")}>
                  {p.education.map((e, i) => <li key={i}><span>{e.school}{e.degree && `, ${e.degree}`}</span>{e.period && <span className="mo-dim">{e.period}</span>}</li>)}
                </ul>
              )}
            </div>
          </section>
        )}

        {hasContact && (
          <section id="mo-contact" className="mo-wrap mo-section" aria-labelledby="mo-contact-h">
            <h2 id="mo-contact-h" className="mo-label">Contact</h2>
            <div className="mo-about">
              {p.email && <a className="mo-email" href={`mailto:${p.email}`} {...track("email")} {...ed("email")}>{p.email}</a>}
              {p.links.length > 0 && (
                <p className="mo-cta" {...ed("links")}>{p.links.map(l => <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" {...track(`link:${l.url}`)}>{l.label} ↗</a>)}</p>
              )}
              {p.contact && <ContactForm portfolioId={p.id} firstName={p.name ? firstName(p.name) : ""} />}
            </div>
          </section>
        )}
      </main>

      <footer className="mo-wrap mo-end">
        <span>© {year()} {name}</span>
        <UnfoldBadge show={p.show_badge} className="mo-badge" />
      </footer>
    </div>
  );
}
