export const maxDuration = 60;

import { chatQueries, itemQueries, reminderQueries, sharingQueries } from "@homebox-ai/db";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { BottomNav } from "./bottom-nav";
import { JOIN_PATH } from "../../lib/pending-join";
import { PendingInviteBanner } from "./pending-invite-banner";
import { Sidebar } from "./sidebar";

const MEMBER_COLORS = ["#3f6b45", "#5b7fa6", "#b0643f", "#8a7a4f"];
const DUE_SOON_DAYS = 7;

function dateKeyInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [unreadChatCount, itemCounts, reminders, householdUsers] = await Promise.all([
    chatQueries.countUnreadProactiveMessages(user.id),
    itemQueries.countItemsByLocation(user.id),
    reminderQueries.listReminders(user.id),
    sharingQueries.listHouseholdUsers(user.id),
  ]);

  const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const userName = fullName || (user.email?.split("@")[0] ?? "You");
  const itemCount = itemCounts.reduce((sum, c) => sum + c.count, 0);
  const dueCutoff = dateKeyInDays(DUE_SOON_DAYS);
  const dueCount = reminders.filter((r) => r.status === "pending" && r.dueDate <= dueCutoff).length;
  const members = householdUsers.map((person, i) => ({
    userId: person.userId,
    initial: (person.isSelf ? userName : (person.email ?? "?")).charAt(0).toUpperCase(),
    color: MEMBER_COLORS[i % MEMBER_COLORS.length]!,
  }));
  const householdLabel = householdUsers.length > 1 ? "Shared household" : `${userName.split(" ")[0]}'s home`;

  // Set at sign-up from an invite link, so the invite can be offered again on any device after confirming.
  const pendingJoin = typeof user.user_metadata?.pending_join === "string" ? user.user_metadata.pending_join : null;
  const pendingInvite =
    pendingJoin && JOIN_PATH.test(pendingJoin)
      ? await sharingQueries.getInviteByToken(pendingJoin.split("/")[2]!)
      : null;
  const showInvite =
    pendingInvite &&
    !pendingInvite.expired &&
    !pendingInvite.alreadyAccepted &&
    pendingInvite.ownerEmail !== user.email;

  return (
    <div id="app-shell" className="mx-auto flex h-dvh w-full max-w-lg bg-surface md:max-w-[672px] lg:max-w-none">
      <Sidebar
        itemCount={itemCount}
        dueCount={dueCount}
        unreadChatCount={unreadChatCount}
        userName={userName}
        householdLabel={householdLabel}
        members={members}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="app-content flex-1 overflow-y-auto lg:px-[max(0px,calc((100%-1048px)/2))] lg:has-[[data-full-bleed]]:px-0">
          {children}
        </div>
        <BottomNav unreadChatCount={unreadChatCount} />
        {showInvite && pendingJoin && (
          <PendingInviteBanner
            href={pendingJoin}
            from={pendingInvite.ownerName?.split(" ")[0] ?? pendingInvite.ownerEmail ?? "Someone"}
            relationship={pendingInvite.relationship}
          />
        )}
      </div>
    </div>
  );
}
