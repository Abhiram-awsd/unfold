"use client";

import { useEffect, useRef } from "react";

function send(body: Record<string, string>) {
  fetch("/api/views", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true, // clicks often navigate away; let the request finish
  }).catch(() => {});
}

/**
 * Records one view per page load (with where the visitor came from) and clicks on anything
 * a template marks with data-track. Fire-and-forget; failures are ignored.
 */
export function ViewBeacon({ portfolioId }: { portfolioId: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    send({
      portfolioId,
      path: location.pathname,
      referrer: document.referrer,
      utm: new URLSearchParams(location.search).get("utm_source") ?? "",
    });
  }, [portfolioId]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-track]");
      const target = el?.getAttribute("data-track");
      if (target) send({ portfolioId, click: target });
    };
    // Capture, so templates that stop propagation still get counted.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [portfolioId]);
  return null;
}
