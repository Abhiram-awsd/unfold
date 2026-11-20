/**
 * Shared analytics helpers: where a visit came from, what a click was on, and how to label both.
 * Sources are stored as a short key (a hostname or "utm:<source>"), never a full URL, so no
 * visitor paths or query strings are kept.
 */

/** The traffic source for a visit, or null for direct visits and same-site navigation. */
export function sourceOf(referrer: string | null | undefined, utmSource: string | null | undefined, ownHost: string | null): string | null {
  const utm = (utmSource ?? "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40);
  if (utm) return `utm:${utm}`;
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
    if (!host || (ownHost && host === ownHost.toLowerCase().replace(/^www\./, ""))) return null;
    return host.slice(0, 120);
  } catch {
    return null;
  }
}

const KNOWN: Array<[RegExp, string]> = [
  [/(^|\.)mail\.google\.com$/, "Gmail"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, "LinkedIn"],
  [/(^|\.)(twitter|x)\.com$|^t\.co$/, "X (Twitter)"],
  [/(^|\.)google\.[a-z.]+$/, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)github\.com$/, "GitHub"],
  [/(^|\.)facebook\.com$|^l\.facebook\.com$|^fb\.me$/, "Facebook"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)whatsapp\.com$|^wa\.me$/, "WhatsApp"],
  [/(^|\.)reddit\.com$/, "Reddit"],
  [/(^|\.)news\.ycombinator\.com$/, "Hacker News"],
  [/(^|\.)outlook\.(live|office)\.com$/, "Outlook"],
  [/(^|\.)slack\.com$/, "Slack"],
  [/(^|\.)dribbble\.com$/, "Dribbble"],
  [/(^|\.)behance\.net$/, "Behance"],
];

/** A readable name for a stored source key. */
export function sourceLabel(source: string): string {
  if (!source) return "Direct or unknown";
  if (source.startsWith("utm:")) {
    const s = source.slice(4);
    const known = KNOWN.find(([re]) => re.test(`${s}.com`))?.[1];
    return `${known ?? `${s.charAt(0).toUpperCase()}${s.slice(1)}`} (campaign link)`;
  }
  for (const [re, label] of KNOWN) if (re.test(source)) return label;
  return source;
}

/**
 * Click targets recorded from public pages:
 *   project:<id>   a project's link or card
 *   link:<url>     one of the owner's links
 *   email | resume a mailto link or the resume download
 */
export const TARGET = /^(project:[A-Za-z0-9-]{1,64}|link:(https?:\/\/|mailto:)\S{1,280}|email|resume)$/;

export function isTarget(value: string): boolean {
  return TARGET.test(value);
}

/** YYYY-MM-DD for an instant in a time zone. */
export function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** A valid IANA time zone, or UTC. */
export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz || tz.length > 64) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/** The last `days` calendar days ending today (in the time zone), oldest first, with zero-filled counts. */
export function fillDays(daily: Array<{ day: string; views: number }>, days: number, timeZone: string): Array<{ day: string; views: number }> {
  const counts = new Map(daily.map(d => [d.day.slice(0, 10), d.views]));
  const out: Array<{ day: string; views: number }> = [];
  const now = Date.now();
  const seen = new Set<string>();
  // Step back in 12-hour increments so DST shifts and odd offsets never skip or repeat a day.
  for (let i = 0; out.length < days && i < days * 2 + 4; i++) {
    const key = dayKey(new Date(now - i * 43_200_000), timeZone);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ day: key, views: counts.get(key) ?? 0 });
  }
  return out.reverse();
}
