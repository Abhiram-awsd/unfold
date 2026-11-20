"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentUserId, store, type PortfolioEdit, type ProjectEdit } from "@/lib/data";
import { skillList, webUrl } from "@/lib/edit";
import { FIELDS, isFieldKey, isProjectField } from "@/lib/fields";
import { parseEducationLines, parseLinkLines } from "@/lib/links";
import { TEMPLATE_IDS } from "@/lib/templates";
import { FONT_IDS, HEX, MODE_IDS } from "@/lib/theme";

export type SaveResult = { ok: true } | { ok: false; message: string };

function refresh() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/editor");
}

/** Saves one field edited on the page. Same limits and clean-up as the dashboard forms. */
export async function saveField(key: string, id: string | null, raw: string): Promise<SaveResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, message: "You’re signed out. Sign in again to save." };
  if (!isFieldKey(key) || typeof raw !== "string") return { ok: false, message: "That can’t be edited here." };
  const def = FIELDS[key];
  const value = def.kind === "text" ? raw.replace(/\r\n?/g, "\n").trim() : raw.replace(/\s+/g, " ").trim();
  if (value.length > def.max) return { ok: false, message: `Keep this under ${def.max} characters.` };
  if ("required" in def && def.required && !value) return { ok: false, message: `${def.label} can’t be empty.` };

  if (isProjectField(key)) {
    if (!id || id.length > 64) return { ok: false, message: "That project no longer exists." };
    const column = key.slice("project.".length) as keyof ProjectEdit;
    let v: string | null = value || null;
    if (column === "link_url" && value) {
      v = webUrl(value);
      if (!v) return { ok: false, message: "Use a web address, like example.com." };
    }
    const edit: Partial<ProjectEdit> = column === "title" || column === "summary" || column === "story" ? { [column]: value } : { [column]: v };
    const res = await store.updateProject(userId, id, edit);
    if (!res.ok) return { ok: false, message: res.error.message };
    refresh();
    return { ok: true };
  }

  let edit: Partial<PortfolioEdit>;
  switch (key) {
    case "email":
      if (value && !z.email().safeParse(value).success) return { ok: false, message: "Enter a valid email address." };
      edit = { email: value || null };
      break;
    case "location":
      edit = { location: value || null };
      break;
    case "skills":
      edit = { skills: skillList(value) };
      break;
    case "links":
      edit = { links: parseLinkLines(value) };
      break;
    case "education":
      edit = { education: parseEducationLines(value) };
      break;
    default:
      edit = { [key]: value } as Partial<PortfolioEdit>; // name, headline, bio
  }
  const res = await store.updatePortfolio(userId, edit);
  if (!res.ok) return { ok: false, message: res.error.message };
  refresh();
  return { ok: true };
}

const Look = z.object({
  theme: z.enum(TEMPLATE_IDS),
  accent: z.string().regex(HEX).nullable(),
  font: z.enum(FONT_IDS),
  mode: z.enum(MODE_IDS),
});

/** Template and appearance, saved as soon as they change in the editor. */
export async function saveLook(input: z.input<typeof Look>): Promise<SaveResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, message: "You’re signed out. Sign in again to save." };
  const look = Look.safeParse(input);
  if (!look.success) return { ok: false, message: "That look isn’t available." };
  const { theme, accent, font, mode } = look.data;
  const res = await store.updatePortfolio(userId, { theme, theme_options: { accent: accent?.toLowerCase() ?? null, font, mode } });
  if (!res.ok) return { ok: false, message: res.error.message };
  refresh();
  return { ok: true };
}
