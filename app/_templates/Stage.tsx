"use client";

import { useEffect, useRef } from "react";

/**
 * A 3D stage for the premium templates. It writes the pointer position to CSS variables on itself,
 * eased with a spring so the scene has weight: --rx/--ry (tilt in degrees) and --px/--py (0–1, for glare).
 * With `scroll`, --sc (0–1) follows the element's progress through the viewport.
 * Children do the 3D with plain CSS (rotateX(var(--rx)), translateZ(…)), so this stays tiny.
 * Touch devices and reduced-motion users get the static (or gently drifting, CSS-only) scene.
 */
export function Stage({ className, max = 8, scroll = false, children, ...rest }: { className?: string; max?: number; scroll?: boolean; children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tx = 0, ty = 0, x = 0, y = 0, vx = 0, vy = 0, raf = 0;
    const tick = () => {
      vx = (vx + (tx - x) * 0.09) * 0.8;
      vy = (vy + (ty - y) * 0.09) * 0.8;
      x += vx;
      y += vy;
      el.style.setProperty("--ry", `${(x * max).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-y * max).toFixed(2)}deg`);
      el.style.setProperty("--px", ((x + 1) / 2).toFixed(3));
      el.style.setProperty("--py", ((y + 1) / 2).toFixed(3));
      raf = Math.abs(vx) + Math.abs(vy) + Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      kick();
    };
    const onLeave = () => { tx = ty = 0; kick(); };
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--sc", Math.max(0, Math.min(1, (innerHeight - r.top) / (innerHeight + r.height))).toFixed(3));
    };
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (fine) {
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
    }
    if (scroll) {
      onScroll();
      addEventListener("scroll", onScroll, { passive: true });
    }
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      removeEventListener("scroll", onScroll);
    };
  }, [max, scroll]);
  return <div ref={ref} className={className} {...rest}>{children}</div>;
}
