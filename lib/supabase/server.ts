import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/**
 * Supabase client for the signed-in user (server components, route handlers,
 * server actions). It sends the Clerk session token, so row-level security
 * applies exactly as it would in the browser.
 */
export async function createUserClient() {
  const { getToken } = await auth();
  return createClient<Database>(url, key, {
    accessToken: async () => (await getToken()) ?? null,
  });
}

/** Supabase client with no user, for public pages. Only sees what the anon role may see. */
export function createPublicClient() {
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
