import { ROOT_DOMAIN } from "@/lib/site";

/** A bare lowercase hostname ("www.maya.dev"), or null if the input isn't one we can serve. */
export function cleanDomain(raw: string): string | null {
  const host = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[/?#].*$/, "").replace(/\.$/, "");
  if (host.length > 253 || !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(host)) return null;
  const root = ROOT_DOMAIN.split(":")[0];
  if (host === root || host.endsWith(`.${root}`) || /(^|\.)(localhost|vercel\.app)$/.test(host)) return null;
  return host;
}

/** Whether the app can attach domains to its Vercel project itself. */
export const vercelReady = () => !!process.env.VERCEL_TOKEN && !!process.env.VERCEL_PROJECT_ID;

async function vercel(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const team = process.env.VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : "";
  const res = await fetch(`https://api.vercel.com${path}${team}`, {
    method,
    headers: { authorization: `Bearer ${process.env.VERCEL_TOKEN}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  return { ok: res.ok, status: res.status, json: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

/** Attaches a domain to the Vercel project so it gets routing and HTTPS. Returns an error message or null. */
export async function attachDomain(domain: string): Promise<string | null> {
  if (!vercelReady()) return null; // self-managed hosting: the operator adds the domain by hand
  try {
    const r = await vercel("POST", `/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains`, { name: domain });
    if (r.ok || r.status === 409) return null; // 409: already on this project
    console.error("[domains] Vercel refused", domain, r.status, r.json);
    return r.status === 403 ? "That domain is in use by another Vercel account. Remove it there first." : "We couldn’t connect that domain. Check the spelling and try again.";
  } catch (e) {
    console.error("[domains]", e);
    return "We couldn’t reach the hosting provider. Try again.";
  }
}

export async function detachDomain(domain: string): Promise<void> {
  if (!vercelReady()) return;
  await vercel("DELETE", `/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${encodeURIComponent(domain)}`).catch(e => console.error("[domains]", e));
}

/** The DNS record the owner has to add at their registrar. */
export function dnsRecord(domain: string): { type: "A" | "CNAME"; name: string; value: string } {
  const apex = domain.split(".").length === 2;
  return apex ? { type: "A", name: "@", value: "76.76.21.21" } : { type: "CNAME", name: domain.split(".")[0], value: "cname.vercel-dns.com" };
}
