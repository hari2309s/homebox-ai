"use server";

import { sharingQueries } from "@homebox-ai/db";
import { redirect } from "next/navigation";

import { requireSessionUser } from "@homebox-ai/supabase/server";

export async function acceptInviteAction(formData: FormData) {
  const user = await requireSessionUser();

  const token = String(formData.get("token") ?? "").trim();
  if (!token) throw new Error("Missing invite token");

  await sharingQueries.acceptInvite(token, user.id);
  redirect("/items");
}
