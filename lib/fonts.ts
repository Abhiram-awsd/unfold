import {
  Bricolage_Grotesque,
  Geist,
  Geist_Mono,
  Hanken_Grotesk,
  Instrument_Serif,
  JetBrains_Mono,
  Manrope,
  Schibsted_Grotesk,
} from "next/font/google";

/* Unfold's own faces (marketing site, dashboard, Dark template). */
export const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
export const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });
export const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

/* Template faces. Each template picks its own pair; all are exposed as CSS variables. */
export const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
export const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
export const schibsted = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-schibsted", display: "swap" });
export const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
export const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

/** All font variables, applied once on <html>. */
export const fontVariables = [hanken, instrument, jetbrains, geist, geistMono, schibsted, bricolage, manrope]
  .map(f => f.variable)
  .join(" ");
