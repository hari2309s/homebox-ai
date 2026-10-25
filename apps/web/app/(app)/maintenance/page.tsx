import { EmptyState } from "@homebox-ai/ui";
import { itemQueries, sharingQueries } from "@homebox-ai/db";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { MaintenancePanel } from "./maintenance-panel";

export default async function MaintenancePage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="flex h-full flex-col p-4">
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
      <div data-scroll-container className="flex h-full flex-col overflow-y-auto">
        <div className="p-4">
          <div className="font-serif text-[30px] leading-none text-ink">Care &amp; upkeep</div>
          <div className="mt-1 font-mono text-[11px] tracking-wide text-muted">
            ADD SOME THINGS FIRST
          </div>
        </div>
        <div className="flex-1 p-4">
          <EmptyState>Add some items first, then come back here for maintenance and warranty suggestions.</EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <MaintenancePanel items={items} householdUsers={householdUsers} currentUserId={user.id} />
    </div>
  );
}
