/**
 * Demo mode: the whole app runs without Clerk or Supabase.
 * Set NEXT_PUBLIC_DEMO_MODE=true in .env.local. Data is kept in .unfold-demo.json in the project folder.
 * Never enable it in production: everyone shares one demo account.
 */
export const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
export const DEMO_USER_ID = "demo-user";
