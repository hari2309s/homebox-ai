import {
  attachmentQueries,
  itemLabelQueries,
  itemQueries,
  maintenanceQueries,
} from "@homebox-ai/db";
import { StaggerItem, StaggerList } from "@homebox-ai/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { createSupabaseServerClient, getSessionUser } from "@homebox-ai/supabase/server";
import { getAttachmentSignedUrls } from "@homebox-ai/supabase/storage";

import { listLabelsCached, listLocationsCached } from "../../../../lib/cached-queries";
import { AttachmentsSection } from "./attachments-section";
import { DeleteItemButton } from "./delete-item-button";
import { ItemEditForm } from "./item-edit-form";
import { MaintenanceSection } from "./maintenance-section";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface-soft p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  );
}

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) notFound();

  const [item, locations, labels, itemLabelRows, attachments, maintenanceEntries, allItems, childItems] =
    await Promise.all([
      itemQueries.getItem(user.id, id),
      listLocationsCached(user.id),
      listLabelsCached(user.id),
      itemLabelQueries.listLabelsForItem(user.id, id),
      attachmentQueries.listAttachmentsForItem(user.id, id),
      maintenanceQueries.listMaintenanceForItem(user.id, id),
      itemQueries.searchItems(user.id, { includeArchived: true }),
      itemQueries.listChildItems(user.id, id),
    ]);

  if (!item) notFound();

  const otherItems = allItems.filter((candidate) => candidate.id !== id);

  const supabase = await createSupabaseServerClient();
  // One batch request instead of N individual signed-URL calls.
  const urlMap = await getAttachmentSignedUrls(
    supabase,
    attachments.map((a) => a.storagePath),
  );
  const attachmentsWithUrls = attachments.map((attachment) => ({
    ...attachment,
    url: urlMap.get(attachment.storagePath) ?? null,
  }));

  const selectedLabelIds = itemLabelRows.map((row) => row.labelId);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 sm:p-6 md:mx-auto md:w-full md:max-w-2xl">
      <div className="flex items-center justify-between">
        <Link href="/items" className="text-sm font-semibold text-ink">
          ← Back to items
        </Link>
        <DeleteItemButton itemId={item.id} itemName={item.name} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-ink">{item.name}</h1>
          {item.archived && (
            <span className="rounded-full bg-muted/20 px-2.5 py-1 text-xs font-semibold text-muted">Archived</span>
          )}
        </div>
        <Link
          href={`/items/${item.id}/label`}
          className="shrink-0 text-sm font-semibold text-ink underline underline-offset-4"
        >
          Print label
        </Link>
      </div>

      <ItemEditForm
        item={item}
        locations={locations}
        labels={labels}
        otherItems={otherItems}
        selectedLabelIds={selectedLabelIds}
      />

      {childItems.length > 0 && (
        <Section title="Contains">
          <StaggerList className="m-0 flex list-none flex-col gap-2 p-0">
            {childItems.map((child) => (
              <StaggerItem key={child.id} hover>
                <Link
                  href={`/items/${child.id}`}
                  className="block rounded-md border border-border bg-card px-3 py-2.5 text-sm font-medium text-ink"
                >
                  {child.name}
                </Link>
              </StaggerItem>
            ))}
          </StaggerList>
        </Section>
      )}

      <Section title="Attachments">
        <AttachmentsSection itemId={item.id} attachments={attachmentsWithUrls} />
      </Section>

      <Section title="Maintenance history">
        <MaintenanceSection itemId={item.id} itemCurrency={item.currency} entries={maintenanceEntries} />
      </Section>
    </div>
  );
}
