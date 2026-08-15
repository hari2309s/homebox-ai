"use server";

import { sharingQueries } from "@homebox-ai/db";
import { redirect } from "next/navigation";

import { getSessionUser } from "@homebox-ai/supabase/server";

export async function acceptInviteAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const token = String(formData.get("token") ?? "").trim();
  if (!token) throw new Error("Missing invite token");

  await sharingQueries.acceptInvite(token, user.id);
  redirect("/items");
}
