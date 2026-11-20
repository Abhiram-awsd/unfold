import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Service-role client: bypasses row-level security. Server only, and only for the few jobs
 * a user's own token can't do (custom domains, account deletion, owner notifications, admin page).
 * Returns null when SUPABASE_SECRET_KEY isn't set, so those features switch off cleanly.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
