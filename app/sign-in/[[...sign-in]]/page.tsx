import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DEMO } from "@/lib/demo";
import { SignIn } from "@clerk/nextjs";
import { ClerkShell } from "@/app/components/ClerkShell";
import { Mark } from "@/app/components/Mark";
import "../../auth.css";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  if (DEMO) redirect("/dashboard"); // nothing to sign in to in demo mode
  return (
    <main className="auth wrap">
      <Mark />
      <ClerkShell>
        <SignIn />
      </ClerkShell>
    </main>
  );
}
