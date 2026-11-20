"use client";

import { useEffect, useRef, useState } from "react";

/** A live, scaled-down preview of a template page. Loads only when scrolled near. */
export function TemplateThumb({ id, name }: { id: string; name: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 1280));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className={`tg-frame${loaded ? " loaded" : ""}`}>
      <iframe
        src={`/templates/${id}`}
        title={`${name} template preview`}
        loading="lazy"
        tabIndex={-1}
        aria-hidden="true"
        style={{ transform: `scale(${scale})` }}
        onLoad={() => setLoaded(true)}
      />
      <span className="tg-shimmer" aria-hidden="true" />
    </div>
  );
}
