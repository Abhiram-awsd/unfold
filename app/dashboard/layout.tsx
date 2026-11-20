import type { Metadata } from "next";
import { UserButton } from "@clerk/nextjs";
import { connection } from "next/server";
import { ClerkShell } from "@/app/components/ClerkShell";
import { Mark } from "@/app/components/Mark";
import { currentUserId, loadOwner } from "@/lib/data";
import { DEMO } from "@/lib/demo";
import { DashNav } from "./extras";
import "./dashboard.css";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  await connection(); // per-request data (demo mode reads no cookies, so Next would otherwise prerender it)
  const userId = await currentUserId();
  const owner = userId ? await loadOwner(userId) : null;
  const view = owner?.ok ? owner.value : null;
  return (
    <ClerkShell>
      <div className="db">
        <header className="db-top">
          <div className="wrap db-top-in">
            <Mark href="/dashboard" />
            {view && <DashNav unread={view.unread} />}
            {DEMO ? (
              <span className="db-demo" title="NEXT_PUBLIC_DEMO_MODE is on: no sign-in, data is stored in .unfold-demo.json">
                <i aria-hidden="true" />Demo mode
              </span>
            ) : (
              <UserButton />
            )}
          </div>
        </header>
        <main className="wrap db-main">{children}</main>
      </div>
    </ClerkShell>
  );
}
