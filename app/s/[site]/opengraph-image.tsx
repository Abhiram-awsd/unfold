import { promises as fs } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { store } from "@/lib/data";
import { DEMO_MEDIA_DIR } from "@/lib/data/demo-store";
import { portfolioHost } from "@/lib/site";
import { accentSet, effectiveMode, normalizeOptions } from "@/lib/theme";

export const alt = "Portfolio preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONTS = path.join(process.cwd(), "assets/og");
const font = (file: string) => fs.readFile(path.join(FONTS, file));

/** The avatar as a data URI (demo files are read from disk; others fetched with a short timeout). */
async function avatarData(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    if (url.startsWith("/api/media/")) {
      const name = path.basename(url.slice("/api/media/".length).split("?")[0]);
      const ext = path.extname(name).slice(1).toLowerCase();
      // The image renderer can't draw WebP, so WebP avatars fall back to initials.
      const type = { png: "image/png", jpg: "image/jpeg", gif: "image/gif" }[ext];
      if (!type) return null;
      return `data:${type};base64,${(await fs.readFile(path.join(DEMO_MEDIA_DIR, name))).toString("base64")}`;
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(png|jpeg|gif)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length <= 5 * 1024 * 1024 ? `data:${type.split(";")[0]};base64,${buf.toString("base64")}` : null;
  } catch {
    return null;
  }
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : s);

/**
 * The link preview for a portfolio (LinkedIn, WhatsApp, Slack, X…). It follows the portfolio's
 * light/dark mode and accent, and uses only real content: name, headline, skills, photo, address.
 */
export default async function Image({ params }: { params: Promise<{ site: string }> }) {
  await connection();
  const site = decodeURIComponent((await params).site);
  const p = await store.getPublicPortfolio(site);
  if (!p) return new Response("Not found", { status: 404 });

  const options = normalizeOptions(p.theme_options);
  const mode = effectiveMode(p.theme, options);
  const dark = mode === "dark";
  const c = dark
    ? { bg: "#0a0a0b", fg: "#f2f2f4", muted: "#9a9aa2", line: "rgba(255,255,255,.12)", chip: "rgba(255,255,255,.06)" }
    : { bg: "#f4f4f2", fg: "#111113", muted: "#5f5f66", line: "rgba(10,10,14,.12)", chip: "rgba(10,10,14,.05)" };
  const accent = options.accent ? accentSet(options.accent, mode) : null;
  const glow = accent?.accent ?? (dark ? "#d8dbe0" : "#8c8f96");

  const name = p.name.trim() || "Portfolio";
  const nameSize = name.length > 26 ? 64 : name.length > 18 ? 78 : 92;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
  const avatar = await avatarData(p.avatar_url);
  const skills = p.skills.slice(0, 4).map(s => clip(s, 22));
  const [w500, w800, serif, mono] = await Promise.all([font("HankenGrotesk-500.woff"), font("HankenGrotesk-800.woff"), font("InstrumentSerif-Italic.woff"), font("JetBrainsMono-500.woff")]);

  const response = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: c.bg, color: c.fg, fontFamily: "Hanken", position: "relative" }}>
        <div style={{ position: "absolute", top: -260, right: -200, width: 760, height: 760, display: "flex", background: `radial-gradient(circle closest-side, ${glow}${dark ? "2e" : "26"} 0%, ${glow}00 68%)` }} />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {avatar ? (
            <img src={avatar} width={72} height={72} style={{ width: 72, height: 72, borderRadius: 72, objectFit: "cover", border: `2px solid ${c.line}` }} alt="" />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 72, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800,
              background: accent ? accent.accent : dark ? "linear-gradient(140deg,#f4f4f6,#9c9ca4 45%,#3c3c42 80%,#b8b8be)" : "#111113", color: accent ? accent.onAccent : dark ? "#0d0d0f" : "#f4f4f2" }}>
              {initials || "·"}
            </div>
          )}
          <div style={{ display: "flex", padding: "10px 18px", borderRadius: 999, border: `1.5px solid ${c.line}`, fontFamily: "Mono", fontSize: 22, color: c.muted }}>
            {portfolioHost(p.slug)}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1000 }}>
          <div style={{ display: "flex", fontSize: nameSize, fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 1 }}>{clip(name, 40)}</div>
          {p.headline && (
            <div style={{ display: "flex", fontFamily: "Serif", fontStyle: "italic", fontSize: 44, lineHeight: 1.2, color: accent ? accent.accent : c.muted }}>
              {clip(p.headline, 90)}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", maxWidth: 820 }}>
            {skills.map(s => (
              <div key={s} style={{ display: "flex", padding: "9px 16px", borderRadius: 999, background: c.chip, border: `1px solid ${c.line}`, fontSize: 22, fontWeight: 500 }}>{s}</div>
            ))}
          </div>
          <div style={{ display: "flex", fontFamily: "Mono", fontSize: 20, color: c.muted }}>
            {p.projects.length > 0 ? `${p.projects.length} project${p.projects.length === 1 ? "" : "s"}` : p.location ? clip(p.location, 28) : ""}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Hanken", data: w500, weight: 500, style: "normal" },
        { name: "Hanken", data: w800, weight: 800, style: "normal" },
        { name: "Serif", data: serif, weight: 400, style: "italic" },
        { name: "Mono", data: mono, weight: 500, style: "normal" },
      ],
      // Short cache: the URL stays the same when the portfolio changes.
      headers: { "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
    },
  );
  return response;
}
