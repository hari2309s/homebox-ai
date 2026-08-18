"use server";

import { sharingQueries } from "@homebox-ai/db";
import { requireSessionUser } from "@homebox-ai/supabase/server";
import { revalidatePath } from "next/cache";

export async function getShareStatusAction() {
  const user = await requireSessionUser();
  return sharingQueries.getShareStatus(user.id);
}

export async function listPendingInvitesAction() {
  const user = await requireSessionUser();
  return sharingQueries.listPendingInvites(user.id);
}

export async function createInviteAction() {
  const user = await requireSessionUser();
  return sharingQueries.createInvite(user.id);
}

export async function revokeInviteAction(formData: FormData) {
  const user = await requireSessionUser();

  const inviteId = String(formData.get("inviteId") ?? "").trim();
  if (!inviteId) throw new Error("Missing invite id");

  await sharingQueries.revokeInvite(user.id, inviteId);
  revalidatePath("/settings");
}

export async function removeMemberAction(formData: FormData) {
  const user = await requireSessionUser();

  const memberUserId = String(formData.get("memberUserId") ?? "").trim();
  if (!memberUserId) throw new Error("Missing member id");

  await sharingQueries.removeMember(user.id, memberUserId);
  revalidatePath("/settings");
}

export async function leaveHouseholdAction() {
  const user = await requireSessionUser();

  await sharingQueries.leaveSharedHousehold(user.id);
  revalidatePath("/settings");
}
