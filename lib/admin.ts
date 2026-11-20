import { DEMO } from "@/lib/demo";

/** Admins are listed by Clerk user id in ADMIN_USER_IDS (comma separated). Demo mode has one user, who is admin. */
export function isAdmin(userId: string | null): boolean {
  if (!userId) return false;
  if (DEMO) return true;
  return (process.env.ADMIN_USER_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean).includes(userId);
}
