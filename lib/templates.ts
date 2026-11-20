import { SAMPLE_ID, SAMPLE_RESUME } from "@/lib/sample-resume";
import type { PublicPortfolio, Theme } from "@/lib/supabase/types";

export { SAMPLE_ID };

/**
 * Every portfolio template. "pro" templates are the Premium set: labelled Premium everywhere and, until paid plans
 * exist, open to everyone (see PREMIUM_OPEN).
 */
export const TEMPLATES = [
  { id: "minimal", name: "Minimal", tier: "free", description: "Quiet, light and typographic. Lets the words do the work." },
  { id: "dark", name: "Dark", tier: "free", description: "A split layout on near-black with a silver headline." },
  { id: "interactive", name: "Interactive", tier: "free", description: "Work previews follow your cursor. Rows open into case studies." },
  { id: "creative", name: "Creative", tier: "free", description: "Big type, bright colour blocks and sticker-like details." },
  { id: "modern", name: "Modern", tier: "free", description: "A bento grid of cards that puts everything on one screen." },
  { id: "developer", name: "Developer", tier: "free", description: "Black and liquid chrome, with your real GitHub activity and a command menu." },
  { id: "atelier", name: "Atelier", tier: "pro", description: "Classic. Warm paper and serif type, with your work as printed plates that tilt in 3D." },
  { id: "prism", name: "Prism", tier: "pro", description: "Modern. Glass and coloured light, with a 3D scene your skills orbit around." },
  { id: "mono", name: "Mono", tier: "pro", description: "Minimal. One typeface, hairlines and a single 3D cube that turns as you scroll." },
] as const satisfies ReadonlyArray<{ id: Theme; name: string; tier: "free" | "pro"; description: string }>;

export type TemplateId = (typeof TEMPLATES)[number]["id"];
export const TEMPLATE_IDS = TEMPLATES.map(t => t.id) as [TemplateId, ...TemplateId[]];
export const DEFAULT_TEMPLATE: TemplateId = "minimal";

export function isTemplateId(value: string): value is TemplateId {
  return (TEMPLATE_IDS as string[]).includes(value);
}

/** Example content for template previews. Clearly a sample person, never a real user. */
export const SAMPLE_PORTFOLIO: PublicPortfolio = {
  id: SAMPLE_ID,
  slug: "maya",
  theme: "minimal",
  show_badge: true,
  ...SAMPLE_RESUME,
  avatar_url: null,
  theme_options: {},
  contact: true,
  resume_url: null,
  projects: SAMPLE_RESUME.projects.map((p, i) => ({ id: `sample-${i + 1}`, image_url: null, link_url: null, stars: null, language: null, ...p })),
};

/** Premium templates are free to use while there are no paid plans. Flip this when billing ships. */
export const PREMIUM_OPEN = true;
export const isPremium = (id: TemplateId) => TEMPLATES.find(t => t.id === id)?.tier === "pro";
