import type { PublicPortfolio } from "@/lib/supabase/types";
import { Atelier } from "./Atelier";
import { Creative } from "./Creative";
import { Dark } from "./Dark";
import { Developer } from "./Developer";
import { Interactive } from "./Interactive";
import { Minimal } from "./Minimal";
import { Modern } from "./Modern";
import { Mono } from "./Mono";
import { Prism } from "./Prism";

const BY_ID = { minimal: Minimal, dark: Dark, interactive: Interactive, creative: Creative, modern: Modern, developer: Developer, atelier: Atelier, prism: Prism, mono: Mono } as const;

/** Renders a portfolio with its chosen template (falls back to Minimal for unknown ids). */
export function PortfolioTemplate({ p }: { p: PublicPortfolio }) {
  const Template = BY_ID[p.theme] ?? Minimal;
  return <Template p={p} />;
}
