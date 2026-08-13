"use server";

import { createSupabaseAdminClient } from "@homebox-ai/supabase/admin";
import { createSupabaseServerClient, getSessionUser } from "@homebox-ai/supabase/server";
import { deleteAllUserAttachments } from "@homebox-ai/supabase/storage";
import { redirect } from "next/navigation";

export async function deleteAccountAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  // Re-check the "type your email to confirm" gate server-side — the client
  // only disables the submit button, which isn't a real guard against an
  // irreversible action being triggered without it (e.g. a submitted form
  // missing its expected fields).
  const confirmation = String(formData.get("confirm") ?? "")
    .trim()
    .toLowerCase();
  const email = user.email?.trim().toLowerCase();
  if (!email || confirmation !== email) {
    throw new Error("Confirmation text does not match your account email.");
  }

  const admin = createSupabaseAdminClient();

  // Storage objects aren't covered by the DB's cascading foreign keys, so
  // they need explicit cleanup before the auth user (and everything that
  // references it) is deleted.
  await deleteAllUserAttachments(admin, user.id);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new Error(error.message);

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/login");
}
