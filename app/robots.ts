import type { MetadataRoute } from "next";
import { ROOT_DOMAIN } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = `${/^(localhost|127\.0\.0\.1)/.test(ROOT_DOMAIN) ? "http" : "https"}://${ROOT_DOMAIN}`;
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/editor", "/admin", "/api/", "/sign-in", "/sign-up"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
