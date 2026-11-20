import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Unfold: turn your resume into a portfolio", template: "%s · Unfold" },
  description: "Upload the resume you already have. Unfold turns it into a portfolio site with its own link, ready to send in minutes.",
};

export const viewport: Viewport = {
  themeColor: "#050506",
  colorScheme: "dark",
  viewportFit: "cover",
};

// Clerk is mounted per section (app/components/ClerkShell.tsx), not here, so published
// portfolios on customer domains load no auth code.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
