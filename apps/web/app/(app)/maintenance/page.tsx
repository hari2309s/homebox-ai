import { EmptyState } from "@homebox-ai/ui";
import { itemQueries } from "@homebox-ai/db";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { MaintenancePanel } from "./maintenance-panel";

export default async function MaintenancePage() {
  const user = await getSessionUser();
  const items = user ? await itemQueries.searchItems(user.id) : [];

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col p-4 sm:p-6">
        <EmptyState>Add some items first, then come back here for maintenance and warranty suggestions.</EmptyState>
      </div>
    );
  }

  return (
    <div className="h-full">
      <MaintenancePanel items={items} />
    </div>
  );
}
