import { itemQueries } from "@homebox-ai/db";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { MaintenancePanel } from "./maintenance-panel";

export default async function MaintenancePage() {
  const user = await getSessionUser();
  const items = user ? await itemQueries.searchItems(user.id) : [];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:mx-auto md:w-full md:max-w-2xl">
      {items.length === 0 ? (
        <p className="rounded-lg bg-surface-soft p-4 text-sm text-muted">
          Add some items first, then come back here for maintenance and warranty suggestions.
        </p>
      ) : (
        <MaintenancePanel items={items} />
      )}
    </div>
  );
}
