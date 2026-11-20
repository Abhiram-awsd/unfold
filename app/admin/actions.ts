"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { currentUserId, store } from "@/lib/data";

export async function unpublish(form: FormData): Promise<void> {
  if (!isAdmin(await currentUserId())) throw new Error("Not allowed");
  const id = String(form.get("id") ?? "");
  if (!id) return;
  const res = await store.adminUnpublish(id);
  if (!res.ok) console.error("[admin]", res.error.message, res.error.cause);
  revalidatePath("/admin");
}
