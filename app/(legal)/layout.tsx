import Link from "next/link";
import { Mark } from "@/app/components/Mark";
import "./legal.css";

export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="lg">
      <header className="lg-top"><Mark href="/" /><Link href="/">Back to Unfold</Link></header>
      <main className="lg-main">{children}</main>
      <footer className="lg-foot"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><span>© {new Date().getFullYear()} Unfold</span></footer>
    </div>
  );
}
