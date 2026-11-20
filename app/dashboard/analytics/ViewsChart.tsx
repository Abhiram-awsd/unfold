"use client";

import { useEffect, useRef, useState } from "react";

const H = 220, PAD = { top: 12, right: 8, bottom: 26, left: 34 };

/** A clean axis maximum (1, 2, 5 × 10ⁿ) with three gridlines. */
function niceMax(n: number): number {
  if (n <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(n));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= n) return m * pow;
  return 10 * pow;
}

const fmtDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}K` : String(n));

/**
 * Daily views as columns. Each column is its own hover/focus target with a tooltip;
 * the same numbers are in the table below the chart.
 */
export function ViewsChart({ days }: { days: Array<{ day: string; views: number }> }) {
  const [hover, setHover] = useState<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  // Drawn at the container's real width, so text never scales with the chart.
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const max = niceMax(Math.max(...days.map(d => d.views), 0));
  const innerW = W - PAD.left - PAD.right, innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / days.length;
  const barW = Math.min(24, Math.max(2, slot - 2)); // 2px surface gap between neighbours
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];
  // Enough room for each date label (about 52px).
  const every = Math.max(1, Math.ceil(52 / slot));
  const h = hover === null ? null : days[hover];

  return (
    <div className="an-chart" ref={wrap} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Daily views over the last ${days.length} days`} width={W} height={H}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="an-grid" />
            <text x={PAD.left - 8} y={y(t)} className="an-tick" textAnchor="end" dominantBaseline="middle">{compact(t)}</text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = PAD.left + i * slot + (slot - barW) / 2;
          const top = y(d.views), height = PAD.top + innerH - top;
          const r = Math.min(4, barW / 2, height);
          return (
            <g key={d.day}>
              {d.views > 0 && (
                <path
                  className={`an-bar${hover === i ? " on" : ""}`}
                  d={`M${x},${PAD.top + innerH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${PAD.top + innerH} Z`}
                />
              )}
              {/* Hit target: the whole slot, taller than the bar. */}
              <rect
                x={PAD.left + i * slot} y={PAD.top} width={slot} height={innerH} className="an-hit"
                tabIndex={0} aria-label={`${fmtDay(d.day)}: ${d.views} view${d.views === 1 ? "" : "s"}`}
                onPointerEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              />
              {i % every === (days.length - 1) % every && (
                <text x={PAD.left + i * slot + slot / 2} y={H - 8} className="an-tick" textAnchor="middle">{fmtDay(d.day)}</text>
              )}
            </g>
          );
        })}
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} className="an-base" />
      </svg>
      {h && hover !== null && (
        <div className="an-tip" style={{ left: `${((PAD.left + hover * slot + slot / 2) / W) * 100}%`, top: `${(y(h.views) / H) * 100}%` }}>
          <b>{h.views.toLocaleString("en-US")}</b> view{h.views === 1 ? "" : "s"}<span>{fmtDay(h.day)}</span>
        </div>
      )}
    </div>
  );
}
