import { auth } from "@clerk/nextjs/server";
import { cache } from "react";
import { DEMO, DEMO_USER_ID } from "@/lib/demo";
import { demoStore } from "./demo-store";
import { supabaseStore } from "./supabase-store";
import type { Store } from "./types";

export * from "./types";

/** The active backend: a local file in demo mode, Supabase otherwise. */
export const store: Store = DEMO ? demoStore : supabaseStore;

/** The signed-in user's id, or null. In demo mode everyone is the demo user. */
export async function currentUserId(): Promise<string | null> {
  if (DEMO) return DEMO_USER_ID;
  return (await auth()).userId;
}

/** The owner's dashboard data, loaded once per request however many components ask for it. */
export const loadOwner = cache((userId: string) => store.loadOwner(userId));
