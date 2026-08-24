import { EmptyState } from "@homebox-ai/ui";
import { itemQueries, sharingQueries } from "@homebox-ai/db";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { MaintenancePanel } from "./maintenance-panel";

export default async function MaintenancePage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="flex h-full flex-col p-4 sm:p-6">
        <EmptyState>Sign in to see maintenance and warranty suggestions.</EmptyState>
      </div>
    );
  }

  const [items, householdUsers] = await Promise.all([
    itemQueries.searchItems(user.id),
    sharingQueries.listHouseholdUsers(user.id),
  ]);

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col p-4 sm:p-6">
        <EmptyState>Add some items first, then come back here for maintenance and warranty suggestions.</EmptyState>
      </div>
    );
  }

  return (
    <div className="h-full">
      <MaintenancePanel items={items} householdUsers={householdUsers} currentUserId={user.id} />
    </div>
  );
}
