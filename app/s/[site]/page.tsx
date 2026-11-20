import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PortfolioTemplate } from "@/app/_templates";
import { store } from "@/lib/data";
import { portfolioUrl, ROOT_DOMAIN } from "@/lib/site";
import { ViewBeacon } from "./ViewBeacon";

/** One lookup per request, shared by the page and its metadata. */
const getPortfolio = cache((site: string) => store.getPublicPortfolio(decodeURIComponent(site)));

export async function generateMetadata({ params }: PageProps<"/s/[site]">): Promise<Metadata> {
  const p = await getPortfolio((await params).site);
  if (!p) return { title: "Not found" };
  const title = p.name ? `${p.name}${p.headline ? ` · ${p.headline}` : ""}` : "Portfolio";
  const description = p.bio.slice(0, 160) || p.headline || undefined;
  return {
    // The sharing image lives on the app domain, which serves /s/<slug>/… for every portfolio host.
    metadataBase: new URL(`${/^(localhost|127\.0\.0\.1)/.test(ROOT_DOMAIN) ? "http" : "https"}://${ROOT_DOMAIN}`),
    title: { absolute: title },
    description,
    openGraph: { type: "profile", title, description, url: portfolioUrl(p.slug), siteName: p.name || "Portfolio" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PortfolioSite({ params }: PageProps<"/s/[site]">) {
  const p = await getPortfolio((await params).site);
  if (!p) notFound();
  return (
    <>
      <ViewBeacon portfolioId={p.id} />
      <PortfolioTemplate p={p} />
    </>
  );
}
