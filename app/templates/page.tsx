import type { Metadata } from "next";
import Link from "next/link";
import { Mark } from "@/app/components/Mark";
import { TEMPLATES } from "@/lib/templates";
import { TemplateThumb } from "./TemplateThumb";
import "./templates.css";

export const metadata: Metadata = {
  title: "Templates",
  description: "Nine portfolio templates: six free and three premium with 3D scenes. Each works with any resume Unfold reads.",
};

const TRAITS: Record<string, string[]> = {
  minimal: ["Light", "Typographic", "Calm motion"],
  dark: ["Dark", "Split layout", "Spotlight cards"],
  interactive: ["Light", "Cursor previews", "Magnetic button"],
  creative: ["Light", "Bold colour", "Stickers"],
  modern: ["Light", "Bento grid", "Copy email"],
  developer: ["Dark", "GitHub activity", "Command menu"],
  atelier: ["Light", "Serif", "3D plates"],
  prism: ["Dark", "Glass", "3D skills orbit"],
  mono: ["Light", "Hairlines", "3D cube"],
};

export default function TemplatesPage() {
  return (
    <div className="tg">
      <header className="wrap tg-top">
        <Mark />
        <Link className="btn btn-silver tg-cta-sm" href="/sign-up">Get started</Link>
      </header>
      <main className="wrap">
        <section className="tg-hero">
          <p className="tg-label">Templates</p>
          <h1>Six free looks. <em>Three premium.</em></h1>
          <p>Every template works with any resume Unfold reads, from a one-page student CV to ten years of case studies. Switch any time; your content moves with you.</p>
        </section>
        <Grid list={TEMPLATES.filter(t => t.tier === "free")} />
        <section className="tg-hero tg-hero-2" id="premium">
          <p className="tg-label">Premium</p>
          <h2>Three with <em>real depth.</em></h2>
          <p>Classic, modern and minimal, each built around a 3D scene that responds to the cursor and to scrolling. Free to use while Unfold is new.</p>
        </section>
        <Grid list={TEMPLATES.filter(t => t.tier === "pro")} premium />
      </main>
    </div>
  );
}

function Grid({ list, premium = false }: { list: ReadonlyArray<(typeof TEMPLATES)[number]>; premium?: boolean }) {
  return (
        <ul className="tg-grid">
      {list.map((t, i) => (
        <li key={t.id} className="tg-card" style={{ "--i": i } as React.CSSProperties}>
          <Link href={`/templates/${t.id}`} className="tg-link" aria-label={`Preview the ${t.name} template`}>
            <TemplateThumb id={t.id} name={t.name} />
          </Link>
          <div className="tg-body">
            <div className="tg-title">
              <h2>{t.name}</h2>
              <span className={premium ? "tg-free tg-premium" : "tg-free"}>{premium ? "Premium" : "Free"}</span>
            </div>
            <p>{t.description}</p>
            <ul className="tg-traits">{TRAITS[t.id]?.map(x => <li key={x}>{x}</li>)}</ul>
            <div className="tg-actions">
              <Link className="btn btn-ghost tg-btn" href={`/templates/${t.id}`}>Preview</Link>
              <Link className="btn btn-silver tg-btn" href="/sign-up">Use {t.name}</Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
