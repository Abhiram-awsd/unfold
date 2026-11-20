import Link from "next/link";
import { Mark } from "./components/Mark";
import "./auth.css";

export default function NotFound() {
  return (
    <main className="auth wrap" style={{ textAlign: "center" }}>
      <Mark />
      <div>
        <h1 style={{ margin: 0, font: "800 40px/1.05 var(--font-display)", letterSpacing: "-.04em" }}>Nothing here yet.</h1>
        <p style={{ color: "var(--muted)", margin: "12px 0 24px" }}>This page or portfolio doesn’t exist, or it hasn’t been published.</p>
        <Link className="btn btn-silver" href="/">Go to Unfold</Link>
      </div>
    </main>
  );
}
