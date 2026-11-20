import type { Theme } from "@/lib/supabase/types";

/**
 * Per-portfolio appearance options, layered on top of a template's own design:
 * an accent colour, a font pair and light/dark. Every option has a "default" that
 * leaves the template exactly as designed.
 */
export type Mode = "default" | "light" | "dark";
export type FontPair = "default" | "grotesk" | "editorial" | "friendly" | "technical" | "classic";
export type ThemeOptions = { accent?: string | null; font?: FontPair; mode?: Mode };

export const MODES: Array<{ id: Mode; label: string }> = [
  { id: "default", label: "Template" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

/** Font pairs use faces already loaded by lib/fonts.ts. */
export const FONT_PAIRS: Array<{ id: FontPair; label: string; display: string; body: string }> = [
  { id: "default", label: "Template", display: "", body: "" },
  { id: "grotesk", label: "Grotesk", display: "var(--font-schibsted)", body: "var(--font-geist)" },
  { id: "editorial", label: "Editorial", display: "var(--font-instrument)", body: "var(--font-manrope)" },
  { id: "friendly", label: "Friendly", display: "var(--font-bricolage)", body: "var(--font-manrope)" },
  { id: "technical", label: "Technical", display: "var(--font-jetbrains)", body: "var(--font-geist)" },
  { id: "classic", label: "Classic", display: "var(--font-hanken)", body: "var(--font-hanken)" },
];
export const FONT_IDS = FONT_PAIRS.map(f => f.id) as [FontPair, ...FontPair[]];
export const MODE_IDS = MODES.map(m => m.id) as [Mode, ...Mode[]];

export const ACCENTS: Array<{ label: string; hex: string }> = [
  { label: "Cobalt", hex: "#2f54eb" },
  { label: "Violet", hex: "#7c3aed" },
  { label: "Emerald", hex: "#10b981" },
  { label: "Rose", hex: "#f43f5e" },
  { label: "Amber", hex: "#f59e0b" },
  { label: "Teal", hex: "#14b8a6" },
];

/** How each template looks when its mode is "default". */
export const NATIVE_MODE: Record<Theme, "light" | "dark"> = {
  minimal: "light",
  dark: "dark",
  interactive: "light",
  creative: "light",
  modern: "light",
  developer: "dark",
  atelier: "light",
  prism: "dark",
  mono: "light",
};

export const HEX = /^#[0-9a-f]{6}$/i;

/** Cleans stored options (they come from JSON, so never trust their shape). */
export function normalizeOptions(raw: unknown): Required<ThemeOptions> {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const accent = typeof o.accent === "string" && HEX.test(o.accent) ? o.accent.toLowerCase() : null;
  const font = FONT_IDS.includes(o.font as FontPair) ? (o.font as FontPair) : "default";
  const mode = MODE_IDS.includes(o.mode as Mode) ? (o.mode as Mode) : "default";
  return { accent, font, mode };
}

export function effectiveMode(theme: Theme, options: ThemeOptions): "light" | "dark" {
  return !options.mode || options.mode === "default" ? NATIVE_MODE[theme] ?? "light" : options.mode;
}

/* ---------- colour maths (sRGB, WCAG contrast) ---------- */

type RGB = [number, number, number];

function toRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
}
function luminance([r, g, b]: RGB): number {
  const c = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(toRgb(a)), luminance(toRgb(b))].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Reference grounds for the two modes (close to every template's background). */
const GROUND = { light: "#f4f4f2", dark: "#0a0a0b" } as const;
const INK = { light: "#111111", dark: "#f2f2f4" } as const;

/**
 * The accent as three usable colours for a mode:
 *  - accent: readable as text on the page (≥ 4.5:1), darkened or lightened only as much as needed
 *  - onAccent: black or white, whichever reads better on the accent
 *  - soft: a tint of the picked colour that body text stays readable on (for highlights)
 */
export function accentSet(hex: string, mode: "light" | "dark"): { accent: string; onAccent: string; soft: string } {
  const ground = GROUND[mode];
  const target: RGB = mode === "light" ? [0, 0, 0] : [255, 255, 255];
  const raw = toRgb(hex);
  let accent = hex;
  for (let t = 0.05; contrast(accent, ground) < 4.5 && t <= 1; t += 0.05) accent = toHex(mix(raw, target, t));
  const onAccent = contrast(accent, "#ffffff") >= contrast(accent, "#000000") ? "#ffffff" : "#000000";
  let soft = hex;
  for (let t = 0.05; contrast(soft, INK[mode]) < 7 && t <= 1; t += 0.05) soft = toHex(mix(raw, toRgb(ground), t));
  return { accent, onAccent, soft };
}

/**
 * Attributes for a template's root element. Templates read --t-* variables with their own
 * defaults as fallbacks, so an empty options object changes nothing.
 */
export function themeAttrs(theme: Theme, raw: unknown): { "data-mode": "light" | "dark"; "data-font": FontPair; "data-accent"?: ""; style: React.CSSProperties } {
  const o = normalizeOptions(raw);
  const mode = effectiveMode(theme, o);
  const style: Record<string, string> = {};
  const pair = FONT_PAIRS.find(f => f.id === o.font);
  if (pair && pair.id !== "default") {
    style["--t-display"] = `${pair.display}, system-ui, sans-serif`;
    style["--t-body"] = `${pair.body}, system-ui, sans-serif`;
  }
  if (o.accent) {
    const set = accentSet(o.accent, mode);
    style["--t-accent"] = set.accent;
    style["--t-on-accent"] = set.onAccent;
    style["--t-accent-soft"] = set.soft;
    style["--t-accent-raw"] = o.accent;
  }
  return { "data-mode": mode, "data-font": o.font, ...(o.accent ? { "data-accent": "" as const } : {}), style: style as React.CSSProperties };
}
