"use server";

import { sharingQueries } from "@homebox-ai/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PENDING_JOIN_COOKIE } from "../../../../lib/pending-join";

import { createSupabaseServerClient, requireSessionUser } from "@homebox-ai/supabase/server";

export async function acceptInviteAction(formData: FormData) {
  const user = await requireSessionUser();

  const token = String(formData.get("token") ?? "").trim();
  if (!token) throw new Error("Missing invite token");

  try {
    await sharingQueries.acceptInvite(token, user.id);
  } catch (err) {
    // Show the reason on the invite page rather than Next's error screen.
    const message = err instanceof Error ? err.message : "Couldn't join this household.";
    redirect(`/join/${encodeURIComponent(token)}?error=${encodeURIComponent(message)}`);
  }
  (await cookies()).delete(PENDING_JOIN_COOKIE);
  if (user.user_metadata?.pending_join) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.updateUser({ data: { pending_join: null } });
  }
  revalidatePath("/", "layout");
  redirect("/items");
}
