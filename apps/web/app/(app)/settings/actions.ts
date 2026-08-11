"use server";

import { createSupabaseAdminClient } from "@homebox-ai/supabase/admin";
import { createSupabaseServerClient, getSessionUser } from "@homebox-ai/supabase/server";
import { deleteAllUserAttachments } from "@homebox-ai/supabase/storage";
import { redirect } from "next/navigation";

export async function deleteAccountAction() {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

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
