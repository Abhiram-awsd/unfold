import { ClerkProvider } from "@clerk/nextjs";
import { DEMO } from "@/lib/demo";

/** Clerk, styled to match Unfold. Used by the marketing, auth and dashboard layouts. Skipped in demo mode. */
export function ClerkShell({ children }: { children: React.ReactNode }) {
  if (DEMO) return <>{children}</>; // demo mode: no Clerk at all
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#e4e4e8",
          colorBackground: "#111113",
          colorInput: "#18181b",
          colorForeground: "#f2f2f4",
          colorMutedForeground: "#93939b",
          colorPrimaryForeground: "#0a0a0b",
          colorInputForeground: "#f2f2f4",
          borderRadius: "12px",
          fontFamily: "var(--font-hanken), system-ui, sans-serif",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
