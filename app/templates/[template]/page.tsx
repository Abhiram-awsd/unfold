import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortfolioTemplate } from "@/app/_templates";
import { isTemplateId, SAMPLE_PORTFOLIO, TEMPLATES } from "@/lib/templates";
import { TemplateBar } from "../TemplateBar";
import "./gallery.css";

export function generateStaticParams() {
  return TEMPLATES.map(t => ({ template: t.id }));
}

export async function generateMetadata({ params }: PageProps<"/templates/[template]">): Promise<Metadata> {
  const { template } = await params;
  const t = TEMPLATES.find(x => x.id === template);
  return { title: t ? `${t.name} template` : "Templates" };
}

/** Live preview of a template filled with sample content, with a switcher between all of them. */
export default async function TemplatePreview({ params }: PageProps<"/templates/[template]">) {
  const id = (await params).template;
  if (!isTemplateId(id)) notFound();
  return (
    <>
      <PortfolioTemplate p={{ ...SAMPLE_PORTFOLIO, theme: id }} />
      <TemplateBar current={id} />
    </>
  );
}
