import { attachmentQueries, itemLabelQueries, itemQueries, labelQueries, locationQueries, maintenanceQueries } from "@homebox-ai/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { createSupabaseServerClient, getSessionUser } from "@homebox-ai/supabase/server";
import { getAttachmentSignedUrl } from "@homebox-ai/supabase/storage";

import { AttachmentsSection } from "./attachments-section";
import { DeleteItemButton } from "./delete-item-button";
import { ItemEditForm } from "./item-edit-form";

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

  const [item, locations, labels, itemLabelRows, attachments, maintenanceEntries] = await Promise.all([
    itemQueries.getItem(user.id, id),
    locationQueries.listLocations(user.id),
    labelQueries.listLabels(user.id),
    itemLabelQueries.listLabelsForItem(user.id, id),
    attachmentQueries.listAttachmentsForItem(user.id, id),
    maintenanceQueries.listMaintenanceForItem(user.id, id),
  ]);

  if (!item) notFound();

  const supabase = await createSupabaseServerClient();
  const attachmentsWithUrls = await Promise.all(
    attachments.map(async (attachment) => {
      const { data } = await getAttachmentSignedUrl(supabase, attachment.storagePath);
      return { ...attachment, url: data?.signedUrl ?? null };
    }),
  );

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
        <Link href={`/items/${item.id}/label`} className="shrink-0 text-sm font-semibold text-ink underline underline-offset-4">
          Print label
        </Link>
      </div>

      <ItemEditForm item={item} locations={locations} labels={labels} selectedLabelIds={selectedLabelIds} />

      <Section title="Attachments">
        <AttachmentsSection itemId={item.id} attachments={attachmentsWithUrls} />
      </Section>

      <Section title="Maintenance history">
        {maintenanceEntries.length === 0 ? (
          <p className="text-sm text-muted">No maintenance logged yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {maintenanceEntries.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-0.5 rounded-md border border-border bg-white px-3 py-2.5">
                <span className="font-medium text-ink">{entry.name}</span>
                <span className="text-xs text-muted">
                  {entry.date}
                  {entry.cost ? ` · $${entry.cost}` : ""}
                </span>
                {entry.description && <span className="text-sm text-body">{entry.description}</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
