"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { TEMPLATES } from "@/lib/templates";

const inFrame = () => window.self !== window.top;

/** Floating switcher on template previews. Hidden when the preview is shown inside the gallery. */
export function TemplateBar({ current }: { current: string }) {
  const framed = useSyncExternalStore(() => () => {}, inFrame, () => false);
  if (framed) return null;
  return (
    <nav className="tp-bar" aria-label="Templates">
      <Link className="tp-note" href="/templates">All templates</Link>
      <span className="tp-links">
        {TEMPLATES.map(t => (
          <Link key={t.id} href={`/templates/${t.id}`} className={t.id === current ? "on" : undefined} aria-current={t.id === current ? "page" : undefined} scroll>
            {t.name}
          </Link>
        ))}
      </span>
      <Link className="tp-use" href="/sign-up">Use this template</Link>
    </nav>
  );
}
