import type { MetadataRoute } from "next";
import { ROOT_DOMAIN } from "@/lib/site";
import { TEMPLATE_IDS } from "@/lib/templates";

const base = `${/^(localhost|127\.0\.0\.1)/.test(ROOT_DOMAIN) ? "http" : "https"}://${ROOT_DOMAIN}`;

/** The app's own public pages. Each portfolio lives on its own host and is found through its owner's links. */
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/templates", ...TEMPLATE_IDS.map(t => `/templates/${t}`), "/privacy", "/terms"].map(path => ({
    url: `${base}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
