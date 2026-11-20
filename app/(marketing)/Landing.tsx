"use client";

/* eslint-disable @next/next/no-html-link-for-pages --
 * Links out of the landing page are plain <a> on purpose: a full page load drops
 * landing.css, whose element rules (h1, h2) would otherwise leak into other routes. */

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { CONTACT_EMAIL } from "@/lib/legal";
import { initLanding } from "./landing-init";
import "./landing.css";

export default function Landing({ signedIn }: { signedIn: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    return initLanding(ref.current);
  }, []);

  return (
    <div className="landing" ref={ref}>
      <a className="skip" href="#main">Skip to content</a>

      <header className="nav wrap">
        <div className="nav-in">
          <a className="mark" href="#top" aria-label="Unfold, back to top">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 5.5 9.5 3v16L3 21.5z" fill="#bdbdc3" /><path d="M9.5 3 15 5.5v16L9.5 19z" fill="#6c6c73" /><path d="M15 5.5 21 3v16l-6 2.5z" fill="#f2f2f4" /></svg>Unfold</a>
          <nav className="nav-links" aria-label="Main">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#themes">Themes</a>
              <a href="/templates">Templates</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="nav-cta">
            {signedIn ? (
              <a className="btn btn-silver" href="/dashboard">Dashboard</a>
            ) : (
              <>
                <a className="signin" href="/sign-in">Sign in</a>
                <a className="btn btn-silver" href="/sign-up">Get started</a>
              </>
            )}
            <button className="menu-btn" id="menuBtn" type="button" aria-expanded="false" aria-controls="menu" aria-label="Open menu">
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M3 6h12M3 12h12" /></svg></button>
          </div>
          <div className="menu" id="menu">
            <a href="#how">How it works</a><a href="#features">Features</a><a href="#themes">Themes</a><a href="/templates">Templates</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a>{signedIn ? <a href="/dashboard">Dashboard</a> : <a href="/sign-in">Sign in</a>}
          </div>
        </div>
      </header>

      <main id="main">
        {/* HERO */}
        <section className="hero" id="top" aria-labelledby="hero-title">
          <canvas id="silk" aria-hidden="true"></canvas>
          <div className="veil"></div>
          <div className="grain"></div>
          <div className="wrap">
            <div className="hero-grid">
            <div className="hero-copy">
              <div className="badge-pill rise"><b>New</b>Import straight from a LinkedIn PDF</div>
              <h1 id="hero-title" className="rise">Your resume, <em>unfolded</em> into a portfolio that gets you hired.</h1>
              <p className="lede rise">Upload the resume you already have. <b>Unfold reads your experience, turns your bullet points into project stories and publishes a portfolio site</b> with its own link, ready to send in minutes.</p>
              <div className="hero-actions rise">
                <a className="btn btn-silver btn-lg" href={signedIn ? "/dashboard" : "/sign-up"}>Unfold my resume<span className="arrow"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg></span></a>
                <div className="micro">Free to start <span>·</span> PDF or DOCX <span>·</span> No credit card</div>
              </div>
            </div>

            <div className="s3d rise" id="s3d" data-state="resume">
              <div className="viewport" id="viewport">
                <div className="fit" id="fit">
                  <div className="tilt" id="tilt">
                    <div className="scene" aria-hidden="true">
                      <div className="floor"></div>
                      <div className="base">
                        <div className="face paper"><span className="pdf">PDF</span><div className="rule"></div>
                          <span className="lbl" style={{ top: "86px" } as CSSProperties}>Experience</span><span className="lbl" style={{ top: "254px" } as CSSProperties}>Skills</span><span className="lbl" style={{ top: "326px" } as CSSProperties}>Contact</span><span className="fold"></span></div>
                        <div className="face site"><div className="glow"></div>
                          <div className="bar"><i></i><i></i><i></i>
                            <span className="url"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2.5" y="5.5" width="7" height="5" rx="1.2" /><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" /></svg>maya.unfold.site</span>
                            <span className="livepill"><b></b>Live · <span id="views">1,284</span> views</span></div></div>
                      </div>
                      <div className="piece avatar" style={{ "--rx": "172px", "--ry": "22px", "--rw": "42px", "--rh": "42px", "--lx": "36px", "--ly": "62px", "--lw": "62px", "--lh": "62px", "--z": "96px", "--lz": "16px", "--d": "0ms" } as CSSProperties}><div className="pf">MI</div></div>
                      <div className="piece name" style={{ "--rx": "222px", "--ry": "22px", "--rw": "206px", "--rh": "44px", "--lx": "112px", "--ly": "58px", "--lw": "320px", "--lh": "76px", "--z": "120px", "--lz": "12px", "--d": "40ms" } as CSSProperties}>
                        <div className="pf pr"><b>Maya Iyer</b><span>Product Designer · Bengaluru</span></div>
                        <div className="pf pl"><small><i></i>Maya Iyer · open to work</small><h3>Designing <em>calm</em> software for busy teams.</h3></div></div>
                      <div className="piece job" style={{ "--rx": "172px", "--ry": "102px", "--rw": "256px", "--rh": "38px", "--lx": "36px", "--ly": "158px", "--lw": "166px", "--lh": "136px", "--z": "60px", "--lz": "22px", "--d": "80ms" } as CSSProperties}>
                        <div className="pf pr"><div className="t">Senior Designer, Linear Health<span>2022–</span></div><div className="ln" style={{ width: "94%" } as CSSProperties}></div><div className="ln" style={{ width: "70%" } as CSSProperties}></div></div>
                        <div className="pf pl"><div className="thumb th1"><div className="ui"><span></span><span></span><span></span></div></div><b>Care dashboard</b><small>Linear Health · 2025</small></div></div>
                      <div className="piece job" style={{ "--rx": "172px", "--ry": "148px", "--rw": "256px", "--rh": "38px", "--lx": "217px", "--ly": "158px", "--lw": "166px", "--lh": "136px", "--z": "78px", "--lz": "30px", "--d": "120ms" } as CSSProperties}>
                        <div className="pf pr"><div className="t">Product Designer, Tandem Bank<span>2019–22</span></div><div className="ln" style={{ width: "88%" } as CSSProperties}></div><div className="ln" style={{ width: "62%" } as CSSProperties}></div></div>
                        <div className="pf pl"><div className="thumb th2"><div className="ui"><span></span><span></span><span></span></div></div><b>Mobile banking</b><small>Tandem · 2022</small></div></div>
                      <div className="piece job" style={{ "--rx": "172px", "--ry": "194px", "--rw": "256px", "--rh": "38px", "--lx": "398px", "--ly": "158px", "--lw": "166px", "--lh": "136px", "--z": "44px", "--lz": "22px", "--d": "160ms" } as CSSProperties}>
                        <div className="pf pr"><div className="t">UI Designer, Studio North<span>2017–19</span></div><div className="ln" style={{ width: "80%" } as CSSProperties}></div><div className="ln" style={{ width: "52%" } as CSSProperties}></div></div>
                        <div className="pf pl"><div className="thumb th3"><div className="ui"><span></span><span></span><span></span></div></div><b>Design tokens</b><small>Open source · 2019</small></div></div>
                      <div className="piece skills" style={{ "--rx": "172px", "--ry": "268px", "--rw": "256px", "--rh": "46px", "--lx": "36px", "--ly": "312px", "--lw": "400px", "--lh": "30px", "--z": "140px", "--lz": "10px", "--d": "200ms" } as CSSProperties}>
                        <div className="pf pr"><span className="chip">Figma</span><span className="chip">Prototyping</span><span className="chip">User research</span><span className="chip">Design systems</span><span className="chip">Motion</span><span className="chip">SQL</span></div>
                        <div className="pf pl"><span className="chip">Figma</span><span className="chip">Prototyping</span><span className="chip">User research</span><span className="chip">Design systems</span><span className="chip">Motion</span></div></div>
                      <div className="piece contact" id="contact" style={{ "--rx": "172px", "--ry": "340px", "--rw": "256px", "--rh": "34px", "--lx": "450px", "--ly": "72px", "--lw": "114px", "--lh": "36px", "--z": "170px", "--lz": "18px", "--d": "240ms" } as CSSProperties}>
                        <div className="pf pr">maya@iyer.design<br />linkedin.com/in/mayaiyer</div>
                        <div className="pf pl">Hire Maya <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6h8M6.5 2.5 10 6l-3.5 3.5" /></svg></div></div>
                      <div className="fbadge" id="bParse" style={{ "--bx": "420px", "--by": "30px", "--bz": "210px" } as CSSProperties}>
                        <span className="ic"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 2.5h5.5L11 5v6.5H3z" /><path d="M5 7h4M5 9.5h3" /></svg></span>
                        <span><b>Reading your resume</b><small>3 roles · 6 skills · 1 photo</small></span></div>
                      <div className="fbadge" id="bPub" style={{ "--bx": "430px", "--by": "322px", "--bz": "90px" } as CSSProperties}>
                        <span className="ic"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5 5.8 10 11 4" /></svg></span>
                        <span><b>Published in 2m 41s</b><small>maya.unfold.site</small></span></div>
                      <div className="fbadge" id="bViews" style={{ "--bx": "470px", "--by": "-34px", "--bz": "110px" } as CSSProperties}>
                        <span><b id="weekViews">+128 visitors</b><small>this week</small></span>
                        <svg className="spark" viewBox="0 0 54 20" fill="none"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e6e6ea" stopOpacity=".35" /><stop offset="1" stopColor="#e6e6ea" stopOpacity="0" /></linearGradient></defs>
                          <path d="M1 16 9 13 17 14 25 9 33 11 41 6 53 2V20H1Z" fill="url(#sg)" /><path d="M1 16 9 13 17 14 25 9 33 11 41 6 53 2" stroke="#ededf0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /><circle cx="53" cy="2" r="1.8" fill="#fff" /></svg></div>
                      <svg className="cursor" id="cursor" viewBox="0 0 18 18"><path d="M2 1.5 15 8.2l-5.8 1.3L6.6 15z" fill="#fff" stroke="#0b0b0c" strokeWidth="1.1" strokeLinejoin="round" /></svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="steps" role="group" aria-label="Demo stage">
                <button className="step" type="button" aria-pressed="true">Resume<span className="prog"></span></button>
                <button className="step" type="button" aria-pressed="false">Unfolding<span className="prog"></span></button>
                <button className="step" type="button" aria-pressed="false">Live portfolio<span className="prog"></span></button>
              </div>
            </div>

            </div>
            <div className="formats">
              <p>Works with the resume you already have</p>
              <span><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2h7l3 3v11H4z" /><path d="M11 2v3h3" /></svg>PDF</span>
              <span><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2h7l3 3v11H4z" /><path d="M7 9l1 4 1-3 1 3 1-4" /></svg>Word DOCX</span>
              <span><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2.5" y="2.5" width="13" height="13" rx="3" /><path d="M6 8v4M6 5.5v.01M9 12V8m0 1.5a1.5 1.5 0 0 1 3 0V12" /></svg>LinkedIn export</span>
              <span><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2h7l3 3v11H4z" /><path d="M7 8h4M7 11h4M7 14h2" /></svg>Google Docs</span>
              <span><svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4h12M3 9h12M3 14h8" /></svg>Plain text</span>
            </div>
          </div>
        </section>

        <div className="wrap">
          {/* HOW */}
          <section className="sec" id="how" aria-labelledby="how-h">
            <div className="sec-head">
              <div className="label">How it works</div>
              <h2 id="how-h">From PDF to a live site in <em>three steps.</em></h2>
              <p className="sec-sub">No templates to fill in and no blank page. Unfold starts from what you&apos;ve already written and you only fix what it got wrong.</p>
            </div>
            <div className="how">
              <article className="card reveal">
                <div className="how-n"><b>1</b>Upload</div>
                <h3>Drop in your resume</h3>
                <p>PDF, Word or a LinkedIn export. Unfold reads roles, dates, skills and links in a few seconds.</p>
                <div className="how-vis"><div className="drop"><span className="file"><i>PDF</i>maya-iyer-resume.pdf</span>drop here</div></div>
              </article>
              <article className="card reveal" style={{ "--rd": "70ms" } as CSSProperties}>
                <div className="how-n"><b>2</b>Review</div>
                <h3>Check what it found</h3>
                <p>Every role becomes a project you can rename, reorder, hide or add screenshots to.</p>
                <div className="how-vis"><div className="review">
                  <div><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.2 5 8.5l4.5-5" /></svg>Care dashboard<span>ready</span></div>
                  <div><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.2 5 8.5l4.5-5" /></svg>Mobile banking<span>ready</span></div>
                  <div className="edit"><svg viewBox="0 0 12 12" fill="none" stroke="#9a9aa2" strokeWidth="1.6" strokeLinecap="round"><path d="M2 10h2l5.5-5.5-2-2L2 8z" /></svg>Design tokens<span>add images</span></div>
                </div></div>
              </article>
              <article className="card reveal" style={{ "--rd": "140ms" } as CSSProperties}>
                <div className="how-n"><b>3</b>Publish</div>
                <h3>Share one link</h3>
                <p>Your site goes live on a free address, or on a domain you own.</p>
                <div className="how-vis"><div className="publish"><span className="url-big"><b></b>maya.unfold.site</span><small>live · updates when you do</small></div></div>
              </article>
            </div>
          </section>

          {/* BEFORE / AFTER */}
          <section className="sec" id="compare" aria-labelledby="ba-h">
            <div className="sec-head center">
              <div className="label">Before and after</div>
              <h2 id="ba-h">Same experience. <em>A far better first impression.</em></h2>
              <p className="sec-sub">Recruiters spend seconds on a resume. A portfolio shows the work behind each line. Drag to compare.</p>
            </div>
            <div className="ba reveal" id="ba">
              <div className="ba-layer ba-site">
                <span className="ba-tag">Portfolio</span>
                <div className="mini">
                  <div className="mini-bar"><i></i><i></i><i></i><span>maya.unfold.site</span></div>
                  <div className="mini-body">
                    <div className="mini-grid">
                      <div style={{ background: "radial-gradient(80% 90% at 25% 20%,#7a7a82,#202024 75%)" } as CSSProperties}></div>
                      <div style={{ background: "linear-gradient(135deg,#1c1c20,#55555c 52%,#18181b)" } as CSSProperties}></div>
                      <div style={{ background: "repeating-linear-gradient(135deg,#202024 0 8px,#2a2a2f 8px 16px)" } as CSSProperties}></div>
                      <div style={{ background: "radial-gradient(70% 80% at 70% 80%,#6a6a72,#1f1f23 70%)" } as CSSProperties}></div>
                    </div>
                    <div><div className="eb">Maya Iyer · Product Designer</div><h4>Designing <em>calm</em> software for busy teams.</h4>
                      <p>Eight years designing health and finance products. Currently leading the care dashboard at Linear Health.</p><span className="mini-btn">Hire Maya</span></div>
                  </div>
                </div>
              </div>
              <div className="ba-layer ba-resume" id="baTop">
                <span className="ba-tag">Resume</span>
                <div className="sheet">
                  <b>Maya Iyer</b><small>Product Designer · Bengaluru · maya@iyer.design</small>
                  <hr />
                  <div className="h">Experience</div>
                  <div className="row">Senior Designer, Linear Health</div><div className="ln" style={{ width: "92%" } as CSSProperties}></div><div className="ln" style={{ width: "70%" } as CSSProperties}></div>
                  <div className="row">Product Designer, Tandem Bank</div><div className="ln" style={{ width: "86%" } as CSSProperties}></div><div className="ln" style={{ width: "58%" } as CSSProperties}></div>
                  <div className="row">UI Designer, Studio North</div><div className="ln" style={{ width: "78%" } as CSSProperties}></div>
                  <hr />
                  <div className="h">Skills</div><div className="ln" style={{ width: "84%" } as CSSProperties}></div><div className="ln" style={{ width: "60%" } as CSSProperties}></div>
                </div>
              </div>
              <div className="ba-handle" id="baHandle"><button className="ba-knob" id="baKnob" type="button" role="slider" aria-label="Compare resume and portfolio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={50}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 6 3 10l4 4M13 6l4 4-4 4" /></svg></button></div>
            </div>
            <p className="ba-note">Sample resume and portfolio for illustration</p>
          </section>

          {/* FEATURES */}
          <section className="sec" id="features" aria-labelledby="f-h">
            <div className="sec-head">
              <div className="label">Features</div>
              <h2 id="f-h">Everything a portfolio needs. <em>Nothing you have to build.</em></h2>
            </div>
            <div className="bento">
              <article className="card feat feat-spot w3 reveal">
                <h3>Reads any resume</h3>
                <p>Columns, tables, two-page CVs and LinkedIn exports. Unfold keeps your dates, titles and links exactly as written.</p>
                <div className="fvis files"><span><i>PDF</i>resume_final_v3.pdf</span><span><i>DOC</i>cv-2026.docx</span><span><i>IN</i>Profile.pdf</span></div>
              </article>
              <article className="card feat feat-spot w3 reveal" style={{ "--rd": "60ms" } as CSSProperties}>
                <h3>Writes your case studies</h3>
                <p>Each bullet point becomes a short project story with the problem, what you did and the result. You approve every word.</p>
                <div className="fvis rewrite">
                  <div className="from">• Redesigned onboarding, +18% activation</div>
                  <div className="to"><b>Onboarding, rebuilt.</b> New patients were dropping off at insurance details. I split the flow into three short steps and activation rose 18% in six weeks.</div>
                </div>
              </article>
              <article className="card feat feat-spot w2 wide-sm reveal">
                <h3>Your own domain</h3>
                <p>Start on unfold.site, then connect a domain you own. HTTPS is set up for you.</p>
                <div className="fvis domain"><svg className="lock" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2.5" y="5.5" width="7" height="5" rx="1.2" /><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" /></svg><span className="typed" id="typed">maya.unfold.site</span><span className="caret"></span></div>
              </article>
              <article className="card feat feat-spot w4 wide-sm reveal" style={{ "--rd": "60ms" } as CSSProperties}>
                <h3>See who&apos;s looking</h3>
                <p>Views, the projects people open and where they came from, so you know which applications landed.</p>
                <div className="fvis">
                  <svg className="chart" id="chart" viewBox="0 0 560 120" preserveAspectRatio="none" aria-label="Sample chart of portfolio views over 30 days" role="img"></svg>
                  <div className="chart-legend"><span>Sep 18</span><span><b id="chartTotal">0</b> views in 30 days (sample)</span><span>Oct 17</span></div>
                </div>
              </article>
              <article className="card feat feat-spot w3 reveal">
                <h3>Stays in sync</h3>
                <p>Upload a new version of your resume and Unfold updates only what changed. Your edits and images stay put.</p>
                <div className="fvis sync">
                  <div className="doc"><span style={{ width: "80%" } as CSSProperties}></span><span style={{ width: "60%" } as CSSProperties}></span><span className="new" style={{ width: "72%" } as CSSProperties}></span><span style={{ width: "50%" } as CSSProperties}></span></div>
                  <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h13l-4-4M18 13H5l4 4" /></svg>
                  <div className="web"><span style={{ width: "70%" } as CSSProperties}></span><span style={{ width: "52%" } as CSSProperties}></span><span className="new" style={{ width: "66%" } as CSSProperties}></span><span style={{ width: "44%" } as CSSProperties}></span></div>
                </div>
              </article>
              <article className="card feat feat-spot w3 reveal" style={{ "--rd": "60ms" } as CSSProperties}>
                <h3>Private by default</h3>
                <p>Choose exactly what goes public. Phone numbers and addresses stay hidden unless you turn them on.</p>
                <div className="fvis toggles">
                  <label className="tog" htmlFor="tg1">Show email address<input id="tg1" type="checkbox" defaultChecked /><span className="switch"></span></label>
                  <label className="tog" htmlFor="tg2">Show phone number<input id="tg2" type="checkbox" /><span className="switch"></span></label>
                  <label className="tog" htmlFor="tg3">Let search engines index my site<input id="tg3" type="checkbox" defaultChecked /><span className="switch"></span></label>
                </div>
              </article>
            </div>
          </section>

          {/* THEMES */}
          <section className="sec" id="themes" aria-labelledby="t-h">
            <div className="sec-head">
              <div className="label">Themes</div>
              <h2 id="t-h">One resume, <em>six free templates.</em></h2>
              <p className="sec-sub">Minimal, Dark, Interactive, Creative, Modern and Developer are all on the free plan. Your content moves with you, so trying a new look takes one click. <a className="tpl-link" href="/templates">See all six with sample content →</a></p>
            </div>
            <div className="themes">
              <div className="theme-list" role="group" aria-label="Choose a theme" id="themeList">
                <button className="theme-btn" type="button" aria-pressed="true" data-t="t-graphite"><b>Dark</b><span>A split layout on near-black. Lets the work glow.</span></button>
                <button className="theme-btn" type="button" aria-pressed="false" data-t="t-paper"><b>Minimal</b><span>Light and typographic. The words do the work.</span></button>
                <button className="theme-btn" type="button" aria-pressed="false" data-t="t-studio"><b>Creative</b><span>Big type and bold colour for people who like to be seen.</span></button>
              </div>
              <div className="preview reveal">
                <div className="pv-bar"><i></i><i></i><i></i><span>maya.unfold.site</span></div>
                <div className="pv t-graphite" id="pv">
                  <div className="pv-top"><span className="pv-logo">Maya Iyer</span><span className="pv-nav"><span>Work</span><span>About</span><span>Contact</span></span></div>
                  <div className="pv-hero"><small>Product Designer · Bengaluru</small><h3>Designing calm software for busy teams.</h3></div>
                  <div className="pv-works">
                    <div><div></div><span>Care dashboard</span></div>
                    <div><div></div><span>Mobile banking</span></div>
                    <div><div></div><span>Design tokens</span></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* PRICING */}
          <section className="sec" id="pricing" aria-labelledby="p-h">
            <div className="sec-head center">
              <div className="label">Pricing</div>
              <h2 id="p-h">Free while we <em>grow.</em></h2>
            </div>
            <div className="plans">
              <article className="card plan reveal">
                <div className="plan-h"><b>Free</b></div>
                <div className="price"><span className="amt">$0</span><small>forever</small></div>
                <p>Everything you need to publish and share your portfolio.</p>
                <ul>
                  <li><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5 6.5 11l6-6.5" /></svg>1 portfolio with your own link</li>
                  <li><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5 6.5 11l6-6.5" /></svg>All 9 templates, including the premium 3D ones</li>
                  <li><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5 6.5 11l6-6.5" /></svg>Edit on the page, images, GitHub import</li>
                  <li><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5 6.5 11l6-6.5" /></svg>Contact form, analytics, link previews</li>
                  <li><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5 6.5 11l6-6.5" /></svg>Connect your own domain</li>
                  <li><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5 6.5 11l6-6.5" /></svg>Small &ldquo;Made with Unfold&rdquo; badge</li>
                </ul>
                <a className="btn btn-ghost" href="/sign-up">Start free</a>
              </article>
              <article className="card plan pro reveal" style={{ "--rd": "60ms" } as CSSProperties}>
                <div className="plan-h"><b>Pro</b><span>Coming later</span></div>
                <div className="price"><span className="amt">Soon</span><small>not on sale yet</small></div>
                <p>For people who want more than one site. Everything free today stays free.</p>
                <ul>
                  <li><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5 6.5 11l6-6.5" /></svg>More than one portfolio</li>
                  <li><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5 6.5 11l6-6.5" /></svg>No Unfold badge</li>
                  <li><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5 6.5 11l6-6.5" /></svg>Job-tailored versions of your site</li>
                </ul>
                <a className="btn btn-ghost" href="/sign-up">Start free today</a>
              </article>
            </div>
            <p className="price-note">No card needed. Delete your account and data any time from Settings.</p>
          </section>

          {/* FAQ */}
          <section className="sec" id="faq" aria-labelledby="q-h">
            <div className="sec-head center">
              <div className="label">FAQ</div>
              <h2 id="q-h">Questions, <em>answered.</em></h2>
            </div>
            <div className="faq" id="faqList">
              <div className="qa"><button type="button" aria-expanded="false" id="q1" aria-controls="a1">What file types can I upload?<span className="pm"></span></button>
                <div className="ans" id="a1" role="region" aria-labelledby="q1"><div><p>PDF, Word (.docx), a LinkedIn profile export, or text pasted from Google Docs. Scanned PDFs work too, though you may need to fix a few lines after import.</p></div></div></div>
              <div className="qa"><button type="button" aria-expanded="false" id="q2" aria-controls="a2">Will it make things up about me?<span className="pm"></span></button>
                <div className="ans" id="a2" role="region" aria-labelledby="q2"><div><p>No. Unfold only rewrites what&apos;s in your resume, and every generated case study is a draft until you approve it. Numbers and employer names are never invented or changed.</p></div></div></div>
              <div className="qa"><button type="button" aria-expanded="false" id="q3" aria-controls="a3">Can I use my own domain?<span className="pm"></span></button>
                <div className="ans" id="a3" role="region" aria-labelledby="q3"><div><p>Yes, and it’s free. Add a domain you own in Settings, update one DNS record and HTTPS is set up automatically.</p></div></div></div>
              <div className="qa"><button type="button" aria-expanded="false" id="q4" aria-controls="a4">What happens to my data?<span className="pm"></span></button>
                <div className="ans" id="a4" role="region" aria-labelledby="q4"><div><p>Your resume is used only to build your portfolio. You can delete your account and every file with one button, and we don&apos;t use your content to train models.</p></div></div></div>
              <div className="qa"><button type="button" aria-expanded="false" id="q5" aria-controls="a5">I&apos;m not a designer. Is this for me?<span className="pm"></span></button>
                <div className="ans" id="a5" role="region" aria-labelledby="q5"><div><p>Yes. Engineers, marketers, analysts and new grads use the same flow. If you don&apos;t have screenshots, Unfold builds project cards from your results and skills instead.</p></div></div></div>
              <div className="qa"><button type="button" aria-expanded="false" id="q6" aria-controls="a6">Can I delete my data?<span className="pm"></span></button>
                <div className="ans" id="a6" role="region" aria-labelledby="q6"><div><p>Yes. Settings has a Delete account button that removes your portfolio, resume files, images, messages and analytics straight away.</p></div></div></div>
            </div>
          </section>

          {/* FINAL CTA */}
          <section className="sec" id="start" aria-labelledby="c-h">
            <div className="final">
              <div className="label">Get started</div>
              <h2 id="c-h">Your next job wants to <em>see the work.</em></h2>
              <p className="sec-sub" style={{ marginInline: "auto" } as CSSProperties}>Drop your resume below to try it. This is a preview, so your file stays in your browser and isn&apos;t uploaded.</p>
              <div className="dz" id="dz">
                <input type="file" id="fileIn" accept=".pdf,.doc,.docx,.txt" aria-label="Choose a resume file" />
                <div className="dz-idle" id="dzIdle">
                  <span className="dz-icon"><svg viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 15V4M6.5 8.5 11 4l4.5 4.5M4 15v2.5A1.5 1.5 0 0 0 5.5 19h11a1.5 1.5 0 0 0 1.5-1.5V15" /></svg></span>
                  <b>Drop your resume here, or click to choose</b>
                  <span>PDF, DOCX or TXT · up to 10 MB</span>
                </div>
                <div className="dz-run" id="dzRun" hidden>
                  <div className="dz-file"><i id="dzExt">PDF</i><b id="dzName">resume.pdf</b><button type="button" id="dzReset">Try another</button></div>
                  <div className="dz-track"><div className="dz-fill" id="dzFill"></div></div>
                  <div className="dz-stage"><span id="dzStage">Reading roles and dates</span><span id="dzPct">0%</span></div>
                  <div className="dz-done" id="dzDone" hidden><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5 6.5 11l6-6.5" /></svg>Preview ready. <a href="/sign-up" className="dz-link">Create an account</a> to publish it.<span>demo</span></div>
                </div>
              </div>
              <div className="micro">Free plan · No credit card · Delete everything any time</div>
            </div>
          </section>
        </div>
      </main>

      <footer>
        <div className="wrap">
          <div className="foot">
            <div>
              <a className="mark" href="#top"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 5.5 9.5 3v16L3 21.5z" fill="#bdbdc3" /><path d="M9.5 3 15 5.5v16L9.5 19z" fill="#6c6c73" /><path d="M15 5.5 21 3v16l-6 2.5z" fill="#f2f2f4" /></svg>Unfold</a>
              <p>Turn the resume you already have into a portfolio people remember.</p>
            </div>
            <div><h4>Product</h4><ul><li><a href="#how">How it works</a></li><li><a href="#features">Features</a></li><li><a href="#themes">Themes</a></li><li><a href="#pricing">Pricing</a></li></ul></div>
            <div><h4>Resources</h4><ul><li><a href="#faq">FAQ</a></li><li><a href="/templates">Templates</a></li><li><a href="/sign-in">Sign in</a></li></ul></div>
            <div><h4>Company</h4><ul><li><a href="/privacy">Privacy</a></li><li><a href="/terms">Terms</a></li><li><a href={`mailto:${CONTACT_EMAIL}`}>Contact</a></li></ul></div>
          </div>
          <div className="foot-base"><span>© 2026 Unfold</span><span>Made for job seekers</span></div>
        </div>
      </footer>

      <div className="toast" id="toast" role="status" aria-live="polite"></div>
    </div>
  );
}
