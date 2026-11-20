/**
 * Fields the on-page editor can change. Templates mark where each one is shown with
 * data-edit="<key>" (and data-id for project fields); the editor reads these definitions
 * to build its popover, and the server action validates against the same limits.
 */
export type FieldKind = "line" | "text" | "email" | "url";
export type FieldDef = { label: string; max: number; kind: FieldKind; required?: boolean; hint?: string; placeholder?: string };

export const FIELDS = {
  name: { label: "Name", max: 80, kind: "line", required: true },
  headline: { label: "Headline", max: 140, kind: "line", placeholder: "Designing calm software for busy teams." },
  bio: { label: "About you", max: 1200, kind: "text" },
  location: { label: "Location", max: 80, kind: "line", placeholder: "Bengaluru" },
  email: { label: "Contact email", max: 200, kind: "email", hint: "Shown on your site only if “Show my email” is on in the overview." },
  skills: { label: "Skills", max: 1000, kind: "line", hint: "Comma separated, up to 20." },
  links: { label: "Links", max: 2000, kind: "text", hint: "One per line, e.g. GitHub | github.com/you", placeholder: "LinkedIn | linkedin.com/in/you" },
  education: { label: "Education", max: 2000, kind: "text", hint: "One per line: School | Degree | Years" },
  "project.title": { label: "Project title", max: 80, kind: "line", required: true },
  "project.organization": { label: "Organisation", max: 80, kind: "line" },
  "project.period": { label: "When", max: 40, kind: "line", placeholder: "2022–2024" },
  "project.summary": { label: "One-line summary", max: 240, kind: "line" },
  "project.story": { label: "Case study", max: 2000, kind: "text" },
  "project.link_url": { label: "Project link", max: 300, kind: "url", placeholder: "example.com/project" },
} as const satisfies Record<string, FieldDef>;

export type FieldKey = keyof typeof FIELDS;
export const FIELD_KEYS = Object.keys(FIELDS) as [FieldKey, ...FieldKey[]];
export const isProjectField = (key: FieldKey) => key.startsWith("project.");

export function isFieldKey(value: string): value is FieldKey {
  return value in FIELDS;
}

/** Portfolio-level fields, in the order the editor's field list shows them. */
export const PORTFOLIO_FIELDS: FieldKey[] = ["name", "headline", "location", "bio", "skills", "links", "education", "email"];
