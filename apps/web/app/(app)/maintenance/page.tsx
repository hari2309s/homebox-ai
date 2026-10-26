import { EmptyState } from "@homebox-ai/ui";
import { itemQueries, reminderQueries, sharingQueries } from "@homebox-ai/db";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { listLocationsCached } from "../../../lib/cached-queries";
import { locationPath, stripeFor, zoneIndexOf } from "../items/item-summary";
import { MaintenanceDesktop } from "./maintenance-desktop";
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

  const [items, householdUsers, reminders, locations] = await Promise.all([
    itemQueries.searchItems(user.id),
    sharingQueries.listHouseholdUsers(user.id),
    reminderQueries.listReminders(user.id),
    listLocationsCached(user.id),
  ]);

  if (items.length === 0) {
    return (
      <div data-scroll-container className="flex h-full flex-col overflow-y-auto">
        <div className="p-4">
          <div className="font-serif text-[30px] leading-none text-ink">Care &amp; upkeep</div>
          <div className="mt-1 font-mono text-[11px] tracking-wide text-muted">ADD SOME THINGS FIRST</div>
        </div>
        <div className="flex-1 p-4">
          <EmptyState>Add some items first, then come back here for maintenance and warranty suggestions.</EmptyState>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full lg:hidden">
        <MaintenancePanel items={items} householdUsers={householdUsers} currentUserId={user.id} />
      </div>
      <div className="hidden lg:block">
        <MaintenanceDesktop
          items={items.map((item) => ({
            id: item.id,
            name: item.name,
            place: locationPath(locations, item.locationId)
              .map((l) => l.name)
              .join(" › "),
            stripe: stripeFor(zoneIndexOf(locations, item.locationId)),
            warrantyExpires: item.lifetimeWarranty ? null : item.warrantyExpires,
          }))}
          reminders={reminders.map((r) => ({
            id: r.id,
            itemId: r.itemId,
            title: r.title,
            dueDate: r.dueDate,
            assignedToUserId: r.assignedToUserId,
            status: r.status,
          }))}
          householdUsers={householdUsers}
          currentUserId={user.id}
        />
      </div>
    </>
  );
}
