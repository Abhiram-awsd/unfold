import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { DEMO } from "@/lib/demo";

const ROOT_HOST = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000").toLowerCase().split(":")[0];
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/editor(.*)", "/admin(.*)"]);

/**
 * Works out which portfolio a request is for from its Host header.
 *  - maya.unfold.site  → "maya"            (a slug)
 *  - mayaiyer.com      → "mayaiyer.com"    (a custom domain; slugs never contain dots)
 *  - unfold.site, www.unfold.site, localhost, IPs and *.vercel.app → null (the app itself)
 */
function portfolioKey(req: NextRequest): string | null {
  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0].replace(/\.$/, "");
  if (!host || host === ROOT_HOST || host === `www.${ROOT_HOST}`) return null;
  if (host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.endsWith(".vercel.app")) return null;
  if (host.endsWith(`.${ROOT_HOST}`)) {
    const sub = host.slice(0, -(ROOT_HOST.length + 1));
    return sub && !sub.includes(".") ? sub : null;
  }
  return host;
}

/** Portfolio hosts are rewritten to /s/<key>; returns null for app requests. */
function rewriteForPortfolio(req: NextRequest): NextResponse | null {
  const key = portfolioKey(req);
  if (!key) return null;
  // App routes a portfolio page calls: the view/click beacon, the contact form and (demo mode) media files.
  const p = req.nextUrl.pathname;
  if (p === "/api/views" || p === "/api/contact" || p.startsWith("/api/media/")) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/s/${encodeURIComponent(key)}${req.nextUrl.pathname === "/" ? "" : req.nextUrl.pathname}`;
  return NextResponse.rewrite(url);
}

const withClerk = clerkMiddleware(async (auth, req) => {
  const rewrite = rewriteForPortfolio(req);
  if (rewrite) return rewrite;
  if (isProtectedRoute(req)) await auth.protect();
});

// Demo mode runs without Clerk: no sign-in, only the portfolio-host rewrite.
export default function proxy(req: NextRequest, event: NextFetchEvent) {
  if (DEMO) return rewriteForPortfolio(req) ?? NextResponse.next();
  return withClerk(req, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
