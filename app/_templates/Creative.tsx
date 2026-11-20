/* eslint-disable @next/next/no-img-element -- user images come from storage at any size; plain <img> keeps templates portable */
import { ContactForm } from "./ContactForm";
import { displayName, ed, firstName, keyWord, linkHost, meta, pad, repoMeta, resumeLabel, rootAttrs, splitOn, track, UnfoldBadge, year, type TemplateProps } from "./shared";
import "./creative.css";

/**
 * Creative: oversized type, bright colour blocks, sticker details and a hard-shadow "printed" feel.
 * Pure CSS motion: the marker swipe on load, a slow-turning sticker and cards that straighten on hover.
 */
export function Creative({ p }: TemplateProps) {
  const name = displayName(p.name);
  const headline = p.headline || "";
  const [before, mark, after] = splitOn(headline, keyWord(headline));
  const hasContact = !!p.email || p.links.length > 0 || p.contact || !!p.resume_url;

  return (
    <div className="cr" {...rootAttrs(p)}>
      <header className="cr-wrap cr-top">
        <span className="cr-chip cr-id">
          {p.avatar_url && <img src={p.avatar_url} alt="" width={26} height={26} />}
          <span {...ed("name")}>{name}</span>
        </span>
        {p.email ? (
          <a className="cr-chip cr-chip-dark" href={`mailto:${p.email}`} {...track("email")}>Say hi ↗</a>
        ) : p.contact ? (
          <a className="cr-chip cr-chip-dark" href="#contact">Say hi ↓</a>
        ) : null}
      </header>

      <main>
        <section className="cr-wrap cr-hero" aria-label="Introduction">
          <h1 {...ed("name")}>
            <span className="cr-hello">Hi, I’m</span>
            <span className="cr-big">{firstName(name)}.</span>
          </h1>
          {headline && (
            <p className="cr-headline" {...ed("headline")}>
              {before}
              {mark && <mark>{mark}</mark>}
              {after}
            </p>
          )}
          {p.location && (
            <div className="cr-sticker" aria-label={`Based in ${p.location}`} {...ed("location")}>
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <defs><path id="cr-circle" d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0" /></defs>
                {/* textLength stretches or squeezes the label to exactly one lap of the circle (2π × 44 ≈ 276). */}
                <text textLength="272" lengthAdjust="spacingAndGlyphs">
                  <textPath href="#cr-circle" textLength="272" lengthAdjust="spacingAndGlyphs">{`based in ${p.location.split(",")[0]} ✦ `.repeat(2)}</textPath>
                </text>
              </svg>
              <span aria-hidden="true">✦</span>
            </div>
          )}
        </section>

        {p.projects.length > 0 && (
          <section className="cr-wrap cr-work" aria-labelledby="cr-work-h">
            <h2 id="cr-work-h" className="cr-h2">Things I’ve <em>made</em></h2>
            <ol className="cr-grid">
              {p.projects.map((pr, i) => (
                <li key={pr.id} className={`cr-card cr-c${i % 5}`}>
                  <div className="cr-card-top">
                    <span className="cr-num">{pad(i + 1)}</span>
                    {pr.period && <span className="cr-period" {...ed("project.period", pr.id)}>{pr.period}</span>}
                  </div>
                  {pr.image_url && <img className="cr-shot" src={pr.image_url} alt={pr.title} loading="lazy" decoding="async" />}
                  <h3 {...ed("project.title", pr.id)}>{pr.title}</h3>
                  {pr.organization && <p className="cr-org" {...ed("project.organization", pr.id)}>{pr.organization}</p>}
                  {pr.summary && <p className="cr-summary" {...ed("project.summary", pr.id)}>{pr.summary}</p>}
                  {pr.story && <p className="cr-story" {...ed("project.story", pr.id)}>{pr.story}</p>}
                  {(pr.link_url || repoMeta(pr)) && (
                    <p className="cr-proj-foot">
                      {pr.link_url && <a className="cr-visit" href={pr.link_url} target="_blank" rel="noopener noreferrer" {...track(`project:${pr.id}`)} {...ed("project.link_url", pr.id)}>{linkHost(pr.link_url)} ↗</a>}
                      {repoMeta(pr) && <span>{repoMeta(pr)}</span>}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {(p.bio || p.skills.length > 0 || p.education.length > 0) && (
          <section className="cr-wrap cr-about" aria-labelledby="cr-about-h">
            <h2 id="cr-about-h" className="cr-h2">A bit <em>about me</em></h2>
            {p.bio && <p className="cr-bio" {...ed("bio")}>{p.bio}</p>}
            {p.skills.length > 0 && (
              <ul className="cr-stickers" aria-label="Skills" {...ed("skills")}>
                {p.skills.map((s, i) => <li key={s} className={`cr-s${i % 5}`}>{s}</li>)}
              </ul>
            )}
            {p.education.length > 0 && (
              <ul className="cr-edu" aria-label="Education" {...ed("education")}>
                {p.education.map((e, i) => (
                  <li key={i}>
                    <span className="cr-edu-tag">{i === 0 ? "Studied at" : "Also"}</span>
                    <b>{e.school}</b>
                    {(e.degree || e.period) && <span>{meta(e.degree, e.period)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {hasContact && (
          <section id="contact" className="cr-wrap cr-contact" aria-labelledby="cr-contact-h">
            <h2 id="cr-contact-h">Let’s make something <em>good</em>.</h2>
            {p.email && <a className="cr-email" href={`mailto:${p.email}`} {...track("email")} {...ed("email")}>
              {p.email}
              <svg className="cr-squiggle" viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2 8 Q 12 2, 22 8 T 42 8 T 62 8 T 82 8 T 102 8 T 122 8 T 142 8 T 162 8 T 182 8 T 202 8 T 222 8 T 242 8 T 262 8 T 282 8 T 298 8" />
              </svg>
            </a>}
            {(p.links.length > 0 || p.resume_url) && (
              <ul className="cr-links" aria-label="Links" {...ed("links")}>
                {p.links.map((l, i) => <li key={l.url}><a className={`cr-chip cr-s${(i + 2) % 5}`} href={l.url} target="_blank" rel="noopener noreferrer" {...track(`link:${l.url}`)}>{l.label} ↗</a></li>)}
                {p.resume_url && <li><a className="cr-chip cr-chip-dark" href={p.resume_url} {...track("resume")}>{resumeLabel(p.resume_url)} ↓</a></li>}
              </ul>
            )}
            {p.contact && <ContactForm portfolioId={p.id} firstName={p.name ? firstName(p.name) : ""} />}
          </section>
        )}
      </main>

      <footer className="cr-wrap cr-foot">
        <span>© {year()} {name}</span>
        <UnfoldBadge show={p.show_badge} className="cr-badge" />
      </footer>
    </div>
  );
}
