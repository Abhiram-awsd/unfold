import type { Metadata } from "next";
import "./editor.css";

export const metadata: Metadata = { title: "Edit on page", robots: { index: false } };

export default function EditorLayout({ children }: LayoutProps<"/editor">) {
  return children;
}
