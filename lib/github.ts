/**
 * Public GitHub contribution calendar, read from github.com/users/<name>/contributions
 * (the same HTML fragment GitHub shows on profiles). No API key needed. Cached for a day.
 * If GitHub changes the markup or the user doesn't exist, this returns null and the section hides.
 */
export type ActivityDay = { date: string; level: number; count: number | null };
export type Activity = { user: string; days: ActivityDay[]; total: number | null; sample?: boolean };

export function parseContributions(html: string, user: string): Activity | null {
  const tips = new Map<string, number>();
  for (const m of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const t = m[2].trim();
    const n = /^no contributions/i.test(t) ? 0 : Number((t.match(/^([\d,]+)\s+contribution/i)?.[1] ?? "").replace(/,/g, ""));
    if (Number.isFinite(n)) tips.set(m[1], n);
  }
  const days: ActivityDay[] = [];
  for (const m of html.matchAll(/<td\b[^>]*>/g)) {
    const tag = m[0];
    const date = tag.match(/\bdata-date="(\d{4}-\d{2}-\d{2})"/)?.[1];
    const level = tag.match(/\bdata-level="(\d)"/)?.[1];
    if (!date || level === undefined) continue;
    const id = tag.match(/\bid="([^"]+)"/)?.[1];
    days.push({ date, level: Math.min(4, Number(level)), count: id && tips.has(id) ? tips.get(id)! : null });
  }
  if (days.length < 30) return null;
  days.sort((a, b) => a.date.localeCompare(b.date));
  const totalMatch = html.match(/([\d,]+)\s+contributions?\s+in\s+the\s+last\s+year/i);
  const total = totalMatch ? Number(totalMatch[1].replace(/,/g, "")) : days.every(d => d.count !== null) ? days.reduce((a, d) => a + (d.count ?? 0), 0) : null;
  return { user, days, total };
}

export async function getActivity(user: string): Promise<Activity | null> {
  try {
    const res = await fetch(`https://github.com/users/${encodeURIComponent(user)}/contributions`, {
      headers: { "User-Agent": "Unfold portfolio (+https://unfold.site)", Accept: "text/html" },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const activity = parseContributions(await res.text(), user);
    // An empty year reads as "inactive" rather than adding anything, so hide the section instead.
    return activity && activity.days.some(d => d.level > 0) ? activity : null;
  } catch {
    return null;
  }
}

/** Deterministic made-up activity for template previews only (labelled "Sample activity"). */
export function sampleActivity(): Activity {
  let s = 7;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const days: ActivityDay[] = [];
  const end = new Date(Date.UTC(2026, 9, 24));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 364 - start.getUTCDay());
  let burst = 0;
  for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const wd = d.getUTCDay();
    if (burst <= 0 && r() < 0.03) burst = 3 + Math.floor(r() * 7);
    let n = r() < (wd === 0 || wd === 6 ? 0.5 : 0.15) ? 0 : Math.round((wd === 0 || wd === 6 ? 1.5 : 4) * (r() * 1.6 + 0.2) * (burst-- > 0 ? 2.4 : 1));
    if (n < 0) n = 0;
    days.push({ date: d.toISOString().slice(0, 10), count: n, level: n === 0 ? 0 : n <= 3 ? 1 : n <= 6 ? 2 : n <= 10 ? 3 : 4 });
  }
  return { user: "example", days, total: days.reduce((a, d) => a + (d.count ?? 0), 0), sample: true };
}
