import {
  attachmentQueries,
  itemLabelQueries,
  itemQueries,
  maintenanceQueries,
} from "@homebox-ai/db";
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

function Section({ title, icon, children }: { title: string; icon?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {icon && <span className="material-symbols-rounded text-base">{icon}</span>}
        {title}
      </h2>
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
  const urlMap = await getAttachmentSignedUrls(
    supabase,
    attachments.map((a) => a.storagePath),
  );
  const attachmentsWithUrls = attachments.map((attachment) => ({
    ...attachment,
    url: urlMap.get(attachment.storagePath) ?? null,
  }));

  const selectedLabelIds = itemLabelRows.map((row) => row.labelId);
  const locationName = item.locationId
    ? locations.find((l) => l.id === item.locationId)?.name
    : null;

  const primaryPhoto = attachmentsWithUrls.find((a) => a.url)?.url;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Hero photo area */}
      <div className="relative h-[260px] shrink-0 bg-[#dfe8d6] dark:bg-[#1e2e20]" style={{ backgroundImage: "radial-gradient(rgba(63,107,69,.18) 1px, transparent 1.2px)", backgroundSize: "10px 10px" }}>
        {primaryPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL
          <img src={primaryPhoto} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="material-symbols-rounded text-5xl text-[#9fb894]">image</span>
          </div>
        )}
        <Link
          href="/items"
          className="absolute left-4 top-[52px] flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#fbfaf6] text-ink no-underline shadow-card dark:bg-card"
        >
          <span className="material-symbols-rounded">arrow_back</span>
        </Link>
        <DeleteItemButton itemId={item.id} itemName={item.name} />
      </div>

      {/* Content */}
      <div className="-mt-[22px] flex flex-col gap-[14px] rounded-t-[22px] bg-surface px-4 pb-6 pt-5">
        {/* Breadcrumb + title */}
        <div className="px-1">
          <div className="font-mono text-[10px] tracking-wide text-accent">
            {locationName ? locationName.toUpperCase() : "UNASSIGNED"}
          </div>
          <h1 className="mt-1 font-serif text-[28px] leading-tight text-ink">{item.name}</h1>
          {item.archived && (
            <span className="mt-1 inline-block rounded-full bg-muted/20 px-2.5 py-1 text-xs font-semibold text-muted">
              Archived
            </span>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <Link
            href={`/items/${item.id}/label`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-[15px] text-[15px] font-semibold text-ink no-underline"
          >
            <span className="material-symbols-rounded text-lg">print</span>
            Print label
          </Link>
          <Link
            href={`/maintenance?itemId=${item.id}`}
            className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-accent px-4 py-[15px] text-[15px] font-semibold text-white no-underline"
          >
            <span className="material-symbols-rounded text-lg">build</span>
            Log service
          </Link>
        </div>

        {/* Edit form */}
        <Section title="Details" icon="edit">
          <ItemEditForm
            item={item}
            locations={locations}
            labels={labels}
            otherItems={otherItems}
            selectedLabelIds={selectedLabelIds}
          />
        </Section>

        {childItems.length > 0 && (
          <Section title="Contains" icon="account_tree">
            <div className="flex flex-col gap-2">
              {childItems.map((child) => (
                <Link
                  key={child.id}
                  href={`/items/${child.id}`}
                  className="rounded-[10px] border border-border bg-surface-soft px-3 py-2.5 text-sm font-medium text-ink no-underline"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          </Section>
        )}

        <Section title="Attachments" icon="attach_file">
          <AttachmentsSection itemId={item.id} attachments={attachmentsWithUrls} />
        </Section>

        <Section title="Maintenance history" icon="build">
          <MaintenanceSection itemId={item.id} itemCurrency={item.currency} entries={maintenanceEntries} />
        </Section>
      </div>
    </div>
  );
}
