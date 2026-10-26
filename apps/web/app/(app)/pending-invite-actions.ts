"use server";

import { createSupabaseServerClient, requireSessionUser } from "@homebox-ai/supabase/server";
import { revalidatePath } from "next/cache";

/** Forgets the invite remembered on the account at sign-up (accepted elsewhere, or the user said no). */
export async function clearPendingInviteAction() {
  await requireSessionUser();
  const supabase = await createSupabaseServerClient();
  await supabase.auth.updateUser({ data: { pending_join: null } });
  revalidatePath("/", "layout");
}
