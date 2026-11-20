"use client";
/* eslint-disable @next/next/no-img-element -- user images come from storage at any size; plain <img> keeps templates portable */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Activity } from "@/lib/github";
import { ContactForm } from "./ContactForm";
import { displayName, ed, firstName, initials, linkHost, pad, repoMeta, resumeLabel, rootAttrs, track, UnfoldBadge, year, type TemplateProps } from "./shared";
import "./developer.css";

type Cmd = { label: string; hint: string; run: () => void };

/**
 * Developer: black, liquid chrome and real data.
 *  - Hero: a chrome "liquid" (SVG goo + specular light) that follows the cursor on a spring.
 *  - Nav: a chrome pill slides to the section in view.
 *  - Activity: the user's GitHub contribution calendar, with delayed-then-instant tooltips.
 *  - Ctrl/⌘K opens a command menu (no animation: it's keyboard-driven and used repeatedly).
 */
export function DeveloperView({ p, activity }: TemplateProps & { activity: Activity | null }) {
  const sections = useMemo(
    () =>
      [
        { id: "work", label: "Work", show: p.projects.length > 0 },
        { id: "activity", label: "Activity", show: !!activity },
        { id: "experience", label: "Experience", show: p.projects.some(x => x.organization) || p.education.length > 0 },
        { id: "skills", label: "Skills", show: p.skills.length > 0 },
        { id: "contact", label: "Contact", show: !!p.email || p.links.length > 0 || p.contact || !!p.resume_url },
      ].filter(s => s.show),
    [p, activity],
  );

  const [toast, setToast] = useState<string | null>(null);
  const [palette, setPalette] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const say = (m: string) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  async function copyEmail() {
    if (!p.email) return;
    try {
      await navigator.clipboard.writeText(p.email);
      say(`Copied ${p.email}`);
    } catch {
      window.location.href = `mailto:${p.email}`;
    }
  }

  const jump = (id: string) => () => document.getElementById(`dv-${id}`)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  const commands: Cmd[] = [
    ...sections.map(s => ({ label: `Go to ${s.label}`, hint: "section", run: jump(s.id) })),
    ...(p.email ? [{ label: "Copy email address", hint: "action", run: copyEmail }] : []),
    ...(p.resume_url ? [{ label: "Download résumé", hint: "file", run: () => { window.location.href = p.resume_url!; } }] : []),
    ...p.links.map(l => ({ label: `Open ${l.label}`, hint: "link", run: () => window.open(l.url, "_blank", "noopener") })),
    { label: "Back to top", hint: "action", run: () => window.scrollTo({ top: 0 }) },
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette(o => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const work = p.projects;
  const timeline = p.projects.filter(x => x.organization);

  return (
    <div className="dv" {...rootAttrs(p)}>
      <Nav name={p.name} avatar={p.avatar_url} sections={sections} onPalette={() => setPalette(true)} />

      <main onPointerMove={spotlight}>
        <section className="dv-wrap dv-hero" aria-label="Introduction">
          <div className="dv-hero-copy">
            {p.location && <p className="dv-status" {...ed("location")}><span className="dv-dot" aria-hidden="true" />{p.location}</p>}
            <h1>
              <span className="dv-in" {...ed("name")}>{displayName(p.name)}</span>
              {p.headline && <span className="dv-chrome-text dv-in" style={{ "--i": 1 } as React.CSSProperties} {...ed("headline")}>{p.headline}</span>}
            </h1>
            {p.bio && <p className="dv-lede dv-in" style={{ "--i": 2 } as React.CSSProperties} {...ed("bio")}>{p.bio}</p>}
            <div className="dv-cta dv-in" style={{ "--i": 3 } as React.CSSProperties}>
              {work.length > 0 && <MetalLink href="#dv-work">See my work</MetalLink>}
              {p.email && <button type="button" className="dv-btn dv-ghost" onClick={copyEmail} {...track("email")}>Copy email</button>}
              {!p.email && p.contact && <a className="dv-btn dv-ghost" href="#dv-contact">Get in touch</a>}
              {p.resume_url && <a className="dv-btn dv-ghost" href={p.resume_url} {...track("resume")}>{resumeLabel(p.resume_url)}</a>}
            </div>
            <dl className="dv-meta dv-in" style={{ "--i": 4 } as React.CSSProperties}>
              {work.length > 0 && <div><dt>projects</dt><dd>{work.length}</dd></div>}
              {p.skills.length > 0 && <div><dt>skills</dt><dd>{p.skills.length}</dd></div>}
              {activity?.total != null && <div><dt>contributions</dt><dd>{activity.total.toLocaleString("en-US")}</dd></div>}
            </dl>
          </div>
          <Liquid />
        </section>

        {work.length > 0 && (
          <section id="dv-work" className="dv-wrap dv-section" aria-labelledby="dv-work-h">
            <SectionHead id="dv-work-h" path="work" title="Selected work" />
            <div className={`dv-grid ${gridLayout(work.length)}`}>
              {work.map((pr, i) => (
                <article key={pr.id} className="dv-card dv-proj">
                  {pr.image_url && <img className="dv-shot" src={pr.image_url} alt={pr.title} loading="lazy" decoding="async" />}
                  <div className="dv-proj-top">
                    {pr.organization ? (
                      <span className="dv-kind" {...ed("project.organization", pr.id)}>{pr.organization}</span>
                    ) : (
                      <span className="dv-kind">{pr.language ?? "Project"}</span>
                    )}
                    <span className="dv-idx">{pad(i + 1)}</span>
                  </div>
                  <h3 {...ed("project.title", pr.id)}>{pr.title}</h3>
                  {pr.summary && <p className="dv-sum" {...ed("project.summary", pr.id)}>{pr.summary}</p>}
                  {pr.story && <p className="dv-story" {...ed("project.story", pr.id)}>{pr.story}</p>}
                  {(pr.link_url || repoMeta(pr)) && (
                    <p className="dv-proj-foot">
                      {pr.link_url && (
                        <a className="dv-visit" href={pr.link_url} target="_blank" rel="noopener noreferrer" {...track(`project:${pr.id}`)} {...ed("project.link_url", pr.id)}>
                          {linkHost(pr.link_url)} <span aria-hidden="true">↗</span>
                        </a>
                      )}
                      {repoMeta(pr) && <span>{repoMeta(pr)}</span>}
                    </p>
                  )}
                  {pr.period && <p className="dv-period" {...ed("project.period", pr.id)}>{pr.period}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {activity && (
          <section id="dv-activity" className="dv-wrap dv-section" aria-labelledby="dv-act-h">
            <SectionHead id="dv-act-h" path="github" title="Commit history" note={activity.sample ? "Sample activity for this preview. Real portfolios show the GitHub account linked in the resume." : `Public contributions on github.com/${activity.user} over the last year.`} />
            <Calendar activity={activity} />
          </section>
        )}

        {(timeline.length > 0 || p.education.length > 0) && (
          <section id="dv-experience" className="dv-wrap dv-section" aria-labelledby="dv-xp-h">
            <SectionHead id="dv-xp-h" path="experience" title="Experience" />
            <ol className="dv-xp">
              {timeline.map(pr => (
                <li key={pr.id}>
                  <span className="dv-xp-when">{pr.period ?? ""}</span>
                  <span className="dv-xp-what"><b>{pr.organization}</b><span>{pr.title}</span></span>
                </li>
              ))}
              {p.education.map((e, i) => (
                <li key={`e${i}`} {...ed("education")}>
                  <span className="dv-xp-when">{e.period ?? ""}</span>
                  <span className="dv-xp-what"><b>{e.school}</b>{e.degree && <span>{e.degree}</span>}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {p.skills.length > 0 && (
          <section id="dv-skills" className="dv-wrap dv-section" aria-labelledby="dv-skills-h">
            <SectionHead id="dv-skills-h" path="stack" title="Tools I reach for" />
            <ul className="dv-skills" {...ed("skills")}>{p.skills.map(s => <li key={s}>{s}</li>)}</ul>
          </section>
        )}

        {(p.email || p.links.length > 0 || p.contact || p.resume_url) && (
          <section id="dv-contact" className="dv-wrap dv-section" aria-labelledby="dv-contact-h">
            <div className="dv-card dv-contact">
              <p className="dv-eyebrow">contact</p>
              <h2 id="dv-contact-h">Have something worth building?</h2>
              {p.email && (
                <div className="dv-mail">
                  <code {...ed("email")}>{p.email}</code>
                  <button type="button" className="dv-btn dv-metal" onClick={copyEmail} {...track("email")}>Copy email</button>
                </div>
              )}
              {(p.links.length > 0 || p.resume_url) && (
                <div className="dv-links" {...ed("links")}>
                  {p.links.map(l => <a key={l.url} className="dv-btn dv-ghost" href={l.url} target="_blank" rel="noopener noreferrer" {...track(`link:${l.url}`)}>{l.label}</a>)}
                  {p.resume_url && <a className="dv-btn dv-ghost" href={p.resume_url} {...track("resume")}>{resumeLabel(p.resume_url)}</a>}
                </div>
              )}
              {p.contact && <ContactForm portfolioId={p.id} firstName={p.name ? firstName(p.name) : ""} />}
            </div>
          </section>
        )}
      </main>

      <footer className="dv-wrap dv-foot">
        <span>© {year()} {displayName(p.name)}</span>
        <UnfoldBadge show={p.show_badge} className="dv-badge" />
      </footer>

      <div className={`dv-toast${toast ? " show" : ""}`} role="status" aria-live="polite">{toast}</div>
      {palette && <Palette commands={commands} onClose={() => setPalette(false)} />}
    </div>
  );
}

/* ---------- pieces ---------- */

/**
 * Card widths that always fill the rows: on 3 columns, a wide first card absorbs one
 * leftover, a wide last card absorbs another; on 2 columns, a wide first card evens out odd counts.
 */
function gridLayout(n: number): string {
  const three = n === 1 ? "solo" : n % 3 === 0 ? "" : n % 3 === 2 ? "f" : "fl";
  return `${three} ${n % 2 ? "odd" : ""}`.trim();
}

/** Card spotlight: writes the pointer position to the hovered card only. */
function spotlight(e: React.PointerEvent) {
  const card = (e.target as HTMLElement).closest<HTMLElement>(".dv-card");
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty("--sx", `${e.clientX - r.left}px`);
  card.style.setProperty("--sy", `${e.clientY - r.top}px`);
}

function SectionHead({ id, path, title, note }: { id: string; path: string; title: string; note?: string }) {
  return (
    <div className="dv-head">
      <div>
        <p className="dv-eyebrow">{path}</p>
        <h2 id={id}>{title}</h2>
      </div>
      {note && <p className="dv-note">{note}</p>}
    </div>
  );
}

/** Chrome button whose highlight follows the pointer. */
function MetalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      className="dv-btn dv-metal"
      href={href}
      onPointerMove={e => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        e.currentTarget.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
      }}
    >
      {children}
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
    </a>
  );
}

function Nav({ name, avatar, sections, onPalette }: { name: string; avatar: string | null; sections: Array<{ id: string; label: string }>; onPalette: () => void }) {
  const links = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const mod = useSyncExternalStore(noop, () => (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl"), () => "Ctrl");

  useEffect(() => {
    const els = sections.map(s => document.getElementById(`dv-${s.id}`)).filter((x): x is HTMLElement => !!x);
    const onScroll = () => {
      let current: string | null = null;
      for (const el of els) if (el.getBoundingClientRect().top < innerHeight * 0.35) current = el.id.slice(3);
      setActive(current);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, [sections]);

  // Move the chrome pill under the active link (transform + width only).
  useEffect(() => {
    const host = links.current, el = pill.current;
    if (!host || !el) return;
    const a = active ? host.querySelector<HTMLAnchorElement>(`a[data-id="${active}"]`) : null;
    if (!a) { el.style.opacity = "0"; return; }
    el.style.opacity = "1";
    el.style.width = `${a.offsetWidth}px`;
    el.style.transform = `translateX(${a.offsetLeft}px)`;
  }, [active]);

  return (
    <header className="dv-wrap dv-nav">
      <div className="dv-nav-in">
        <a className="dv-logo" href="#top" onClick={e => { e.preventDefault(); scrollTo({ top: 0 }); }}>
          <span className="dv-logo-mark" aria-hidden="true">
            {avatar ? <img src={avatar} alt="" width={26} height={26} /> : initials(name).slice(0, 1).toLowerCase()}
          </span>
          <span className="dv-logo-name">{displayName(name)}</span>
        </a>
        <nav className="dv-links-nav" ref={links} aria-label="Sections">
          <span className="dv-pill" ref={pill} aria-hidden="true" />
          {sections.map(s => (
            <a key={s.id} data-id={s.id} href={`#dv-${s.id}`} className={active === s.id ? "on" : undefined}>{s.label}</a>
          ))}
        </nav>
        <button type="button" className="dv-kbd" onClick={onPalette} aria-label="Open command menu"><kbd>{mod}</kbd><kbd>K</kbd></button>
      </div>
    </header>
  );
}

/** The liquid chrome: blurred circles thresholded into goo, lit by a light that follows the cursor. */
function Liquid() {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const root = svg.current;
    if (!root) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const circles = Array.from(root.querySelectorAll<SVGCircleElement>("[data-b]"));
    const cursor = root.querySelector<SVGCircleElement>("[data-cursor]")!;
    const light = root.querySelector<SVGFEPointLightElement>("fePointLight")!;
    const blobs = circles.map((el, i) => ({ el, ...BLOBS[i] }));
    if (reduce) {
      blobs.forEach(b => { b.el.setAttribute("cx", String(b.ox)); b.el.setAttribute("cy", String(b.oy)); });
      return;
    }
    const c = { x: 250, y: 250, vx: 0, vy: 0, tx: 250, ty: 250 };
    const lp = { x: 120, y: 60 }, lc = { x: 120, y: 60 };
    let idle = true, idleTimer: ReturnType<typeof setTimeout> | undefined, visible = true, raf = 0, last = performance.now();
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 500, y = ((e.clientY - r.top) / r.height) * 500;
      const dx = x - 250, dy = y - 250, d = Math.hypot(dx, dy), k = d > 190 ? 190 / d : 1;
      c.tx = 250 + dx * k; c.ty = 250 + dy * k;
      lp.x = 250 + dx * 0.6 - 60; lp.y = 250 + dy * 0.6 - 160;
      idle = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => (idle = true), 2200);
    };
    const io = new IntersectionObserver(es => (visible = es[0].isIntersecting));
    io.observe(root);
    const frame = (now: number) => {
      const dt = Math.min(32, now - last); last = now;
      if (visible) {
        for (const b of blobs) {
          const t = now * b.sp + b.ph;
          b.el.setAttribute("cx", (b.ox + Math.sin(t) * b.ax + Math.sin(t * 1.7) * b.ax * 0.3).toFixed(1));
          b.el.setAttribute("cy", (b.oy + Math.cos(t * 1.3) * b.ay).toFixed(1));
        }
        if (idle) { const t = now * 0.0006; c.tx = 250 + Math.cos(t) * 150; c.ty = 250 + Math.sin(t * 1.4) * 120; }
        c.vx = (c.vx + (c.tx - c.x) * 0.0009 * dt) * 0.86;
        c.vy = (c.vy + (c.ty - c.y) * 0.0009 * dt) * 0.86;
        c.x += c.vx * dt * 0.06; c.y += c.vy * dt * 0.06;
        cursor.setAttribute("cx", c.x.toFixed(1)); cursor.setAttribute("cy", c.y.toFixed(1));
        lc.x += (lp.x - lc.x) * 0.06; lc.y += (lp.y - lc.y) * 0.06;
        light.setAttribute("x", lc.x.toFixed(1)); light.setAttribute("y", lc.y.toFixed(1));
      }
      raf = requestAnimationFrame(frame);
    };
    addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(frame);
    return () => { removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); io.disconnect(); clearTimeout(idleTimer); };
  }, []);

  return (
    <div className="dv-liquid" aria-hidden="true">
      <svg ref={svg} viewBox="0 0 500 500">
        <defs>
          <linearGradient id="dv-metal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#cfd2d8" /><stop offset=".35" stopColor="#6b6e75" /><stop offset=".6" stopColor="#2b2c31" /><stop offset="1" stopColor="#8c9097" />
          </linearGradient>
          <filter id="dv-goo" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="b" />
            <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 30 -13" result="goo" />
            <feGaussianBlur in="goo" stdDeviation="7" result="soft" />
            <feSpecularLighting in="soft" surfaceScale="7" specularConstant="1.25" specularExponent="26" lightingColor="#ffffff" result="spec">
              <fePointLight x="120" y="60" z="260" />
            </feSpecularLighting>
            <feComposite in="spec" in2="goo" operator="in" result="specIn" />
            <feSpecularLighting in="soft" surfaceScale="4" specularConstant=".6" specularExponent="8" lightingColor="#9aa0aa" result="rim">
              <fePointLight x="420" y="480" z="120" />
            </feSpecularLighting>
            <feComposite in="rim" in2="goo" operator="in" result="rimIn" />
            <feComposite in="goo" in2="specIn" operator="arithmetic" k1="0" k2="1" k3=".95" k4="0" result="lit" />
            <feComposite in="lit" in2="rimIn" operator="arithmetic" k1="0" k2="1" k3=".35" k4="0" />
          </filter>
        </defs>
        <g filter="url(#dv-goo)" fill="url(#dv-metal)">
          {BLOBS.map((b, i) => <circle key={i} data-b="" r={b.r} cx={b.ox} cy={b.oy} />)}
          <circle data-cursor="" r={46} cx={300} cy={290} />
        </g>
      </svg>
    </div>
  );
}

const BLOBS = [
  { r: 108, ox: 250, oy: 250, ax: 26, ay: 20, sp: 0.00042, ph: 0 },
  { r: 62, ox: 330, oy: 170, ax: 48, ay: 36, sp: 0.00061, ph: 1.7 },
  { r: 54, ox: 170, oy: 330, ax: 40, ay: 44, sp: 0.00053, ph: 3.1 },
  { r: 38, ox: 345, oy: 340, ax: 34, ay: 30, sp: 0.00077, ph: 4.4 },
  { r: 30, ox: 160, oy: 165, ax: 30, ay: 26, sp: 0.00083, ph: 5.2 },
];

const noop = () => () => {};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** GitHub-style calendar. Tooltips wait 220ms the first time, then follow instantly between cells. */
function Calendar({ activity }: { activity: Activity }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number; instant: boolean } | null>(null);
  const open = useRef(false);
  const delay = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const days = activity.days;
  const lead = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  const weeks = Math.ceil((lead + days.length) / 7);
  const months: string[] = Array(weeks).fill("");
  let lastMonth = -1;
  days.forEach((d, i) => {
    const m = Number(d.date.slice(5, 7)) - 1;
    if (m !== lastMonth && Number(d.date.slice(8, 10)) <= 7) { months[Math.floor((lead + i) / 7)] = MONTHS[m]; lastMonth = m; }
  });
  let streak = 0, run = 0;
  for (const d of days) { run = d.level > 0 ? run + 1 : 0; streak = Math.max(streak, run); }
  const active = days.filter(d => d.level > 0).length;

  function show(e: React.PointerEvent | React.FocusEvent, i: number) {
    const cell = e.currentTarget as HTMLElement, host = wrap.current;
    if (!host) return;
    const d = days[i];
    const when = new Date(`${d.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    const text = d.count === null ? `${["No", "Some", "More", "Lots of", "Loads of"][d.level]} activity · ${when}` : `${d.count || "No"} contribution${d.count === 1 ? "" : "s"} · ${when}`;
    const r = cell.getBoundingClientRect(), w = host.getBoundingClientRect();
    const place = () => setTip({ text, x: r.left - w.left + host.scrollLeft + r.width / 2, y: r.top - w.top, instant: open.current });
    clearTimeout(delay.current);
    if (open.current || e.type === "focus") { place(); open.current = true; }
    else delay.current = setTimeout(() => { place(); open.current = true; }, 220);
  }
  function hide() {
    clearTimeout(delay.current);
    setTip(null);
    delay.current = setTimeout(() => (open.current = false), 300);
  }
  useEffect(() => () => clearTimeout(delay.current), []);

  return (
    <div className="dv-card dv-gh">
      <div className="dv-cal-scroll" ref={wrap} onPointerLeave={hide}>
        <div className="dv-cal" style={{ "--weeks": weeks } as React.CSSProperties}>
          <div className="dv-months" aria-hidden="true">{months.map((m, i) => <span key={i}>{m}</span>)}</div>
          <div className="dv-days" aria-hidden="true"><span /><span>Mon</span><span /><span>Wed</span><span /><span>Fri</span><span /></div>
          <div className="dv-cells" role="img" aria-label={`${activity.total ?? active} contributions in the last year`}>
            {Array.from({ length: lead }, (_, i) => <i key={`p${i}`} className="dv-cell empty" />)}
            {days.map((d, i) => (
              <i key={d.date} className="dv-cell" data-l={d.level} tabIndex={-1} onPointerEnter={e => show(e, i)} onFocus={e => show(e, i)} onBlur={hide} />
            ))}
          </div>
        </div>
        {tip && <span className={`dv-tip${tip.instant ? " instant" : ""}`} style={{ left: tip.x, top: tip.y }}>{tip.text}</span>}
      </div>
      <div className="dv-gh-foot">
        <dl>
          {activity.total != null && <div><dt>last year</dt><dd>{activity.total.toLocaleString("en-US")}</dd></div>}
          <div><dt>active days</dt><dd>{active}</dd></div>
          <div><dt>longest streak</dt><dd>{streak}d</dd></div>
        </dl>
        <span className="dv-legend" aria-hidden="true">Less <i className="dv-cell" /><i className="dv-cell" data-l="1" /><i className="dv-cell" data-l="2" /><i className="dv-cell" data-l="3" /><i className="dv-cell" data-l="4" /> More</span>
      </div>
    </div>
  );
}

/** Command menu. No open/close animation: it's keyboard-driven and opened often. */
function Palette({ commands, onClose }: { commands: Cmd[]; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const shown = commands.filter(c => c.label.toLowerCase().includes(q.trim().toLowerCase()));
  const current = Math.min(sel, Math.max(0, shown.length - 1));
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    input.current?.focus();
    return () => prev?.focus?.();
  }, []);
  const run = (c?: Cmd) => { if (!c) return; onClose(); c.run(); };
  return (
    <div className="dv-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dv-palette" role="dialog" aria-modal="true" aria-label="Command menu">
        <input
          ref={input}
          value={q}
          onChange={e => { setQ(e.target.value); setSel(0); }}
          onKeyDown={e => {
            if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => (s + 1) % Math.max(1, shown.length)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => (s - 1 + shown.length) % Math.max(1, shown.length)); }
            else if (e.key === "Enter") { e.preventDefault(); run(shown[current]); }
            else if (e.key === "Escape") { e.preventDefault(); onClose(); }
          }}
          placeholder="Jump to a section or run a command…"
          aria-label="Search commands"
        />
        <ul role="listbox" aria-label="Commands">
          {shown.length === 0 && <li className="dv-empty">No command matches “{q}”</li>}
          {shown.map((c, i) => (
            <li key={c.label} role="option" aria-selected={i === current} onPointerMove={() => setSel(i)} onClick={() => run(c)}>
              {c.label}<span>{c.hint}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

