import { EmptyState } from "@homebox-ai/ui";
import { itemQueries, reminderQueries, sharingQueries } from "@homebox-ai/db";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { CalendarView } from "./calendar-view";

export default async function CalendarPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="flex h-full flex-col p-4 sm:p-6">
        <EmptyState>Sign in to see your maintenance calendar.</EmptyState>
      </div>
    );
  }

  const [reminders, householdUsers, items] = await Promise.all([
    reminderQueries.listReminders(user.id),
    sharingQueries.listHouseholdUsers(user.id),
    itemQueries.searchItems(user.id),
  ]);

  return (
    <div className="h-full">
      <CalendarView reminders={reminders} householdUsers={householdUsers} items={items} currentUserId={user.id} />
    </div>
  );
}
