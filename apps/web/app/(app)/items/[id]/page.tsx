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
import { breadcrumb, detailRows, locationPath, MiniPlan, StatStrip, stripeFor, summaryStats, zoneIndexOf } from "../item-summary";
import { AttachmentsSection } from "./attachments-section";
import { DeleteItemButton } from "./delete-item-button";
import { ItemDetailsCard } from "./item-details-card";
import { MaintenanceSection } from "./maintenance-section";

function Card({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-[14px] border border-border bg-card px-[14px] pt-1">
      <h2 className="m-0 py-[10px] font-serif text-[18px] font-normal text-ink">{title}</h2>
      {children}
    </section>
  );
}

const BAR_BASE = "flex h-9 items-center gap-[6px] rounded-[10px] px-[14px] text-[13px] font-semibold no-underline";
const BAR_BUTTON = `${BAR_BASE} border border-border bg-card text-ink`;
const BAR_PRIMARY = `${BAR_BASE} bg-accent text-white`;

export default async function ItemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const [{ id }, { edit }] = await Promise.all([params, searchParams]);
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
  const labelNames = labels.filter((l) => selectedLabelIds.includes(l.id)).map((l) => l.name);
  const path = locationPath(locations, item.locationId);
  const zoneIndex = zoneIndexOf(locations, item.locationId);
  const crumb = breadcrumb(path);

  const photos = attachmentsWithUrls.filter((a) => a.type === "photo" && a.url);
  const cover = attachmentsWithUrls.find((a) => a.isPrimary && a.url) ?? photos[0] ?? attachmentsWithUrls.find((a) => a.url);
  const thumbs = photos.filter((p) => p.id !== cover?.id).slice(0, 3);
  const lastCare = maintenanceEntries.map((e) => e.date).sort().at(-1) ?? null;
  const rows = detailRows(item, path.map((l) => l.name).join(" › ") || "Unassigned", labelNames);

  return (
    <div className="flex h-full flex-col overflow-y-auto lg:gap-[18px] lg:px-8 lg:py-6">
      {/* Desktop action bar */}
      <div className="hidden items-center gap-[10px] lg:flex">
        <Link href="/items" className="flex items-center gap-1 text-[14px] font-semibold text-accent no-underline">
          <span className="material-symbols-rounded text-[18px]">arrow_back</span>
          Things
        </Link>
        <span className="flex-1" />
        <Link href={`/items/${item.id}/label`} className={BAR_BUTTON}>
          <span className="material-symbols-rounded text-[16px]">qr_code_2</span>
          Print label
        </Link>
        <Link href={`/items/${item.id}?edit=1#details`} className={BAR_BUTTON}>
          Move
        </Link>
        <a href="#care" className={BAR_PRIMARY}>
          Log service
        </a>
        <DeleteItemButton
          itemId={item.id}
          itemName={item.name}
          icon="delete"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border border-border bg-card text-muted hover:text-[#b0643f]"
        />
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start lg:gap-6">
        {/* Photo column */}
        <div className="flex flex-col gap-3">
          <div
            className="relative h-[260px] shrink-0 overflow-hidden bg-(--plan-ground) lg:h-[320px] lg:rounded-2xl"
            style={
              cover
                ? undefined
                : { backgroundImage: stripeFor(zoneIndex, 10) }
            }
          >
            {cover?.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL
              <img src={cover.url} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="material-symbols-rounded text-5xl text-(--plan-ink) opacity-40">image</span>
              </div>
            )}
            <Link
              href="/items"
              aria-label="Back to things"
              className="absolute left-4 top-[52px] flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-rail text-ink no-underline shadow-card lg:hidden"
            >
              <span className="material-symbols-rounded">arrow_back</span>
            </Link>
            <div className="lg:hidden">
              <DeleteItemButton itemId={item.id} itemName={item.name} />
            </div>
          </div>

          <div className="hidden grid-cols-4 gap-2 lg:grid">
            {thumbs.map((photo) => (
              <a key={photo.id} href={photo.url!} target="_blank" rel="noreferrer" className="block h-16 overflow-hidden rounded-[10px]">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL */}
                <img src={photo.url!} alt="" className="h-full w-full object-cover" />
              </a>
            ))}
            <a
              href="#attachments"
              aria-label="Add a photo"
              className="flex h-16 items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-[#b9bfb3] text-accent no-underline dark:border-border"
            >
              <span className="material-symbols-rounded">add_a_photo</span>
            </a>
          </div>

          <MiniPlan
            zoneIndex={zoneIndex}
            label={path.length ? path.slice(-2).map((l) => l.name.toUpperCase()).join(" · ") : "NOT PLACED YET"}
            className="hidden min-h-[160px] lg:block"
          />
        </div>

        {/* Content */}
        <div className="-mt-[22px] flex min-w-0 flex-col gap-[14px] rounded-t-[22px] bg-surface px-4 pb-6 pt-5 lg:mt-0 lg:rounded-none lg:bg-transparent lg:p-0">
          <div className="px-1 lg:px-0">
            <div className="truncate font-mono text-[10px] tracking-wide text-accent">{crumb}</div>
            <h1 className="m-0 mt-1 font-serif text-[28px] font-normal leading-tight text-ink lg:text-[34px] lg:leading-[1.1]">
              {item.name}
            </h1>
            {item.archived && (
              <span className="mt-2 inline-block rounded-full bg-surface-soft px-2.5 py-1 text-xs font-semibold text-muted">
                Archived
              </span>
            )}
          </div>

          {/* Mobile quick actions */}
          <div className="flex gap-2 lg:hidden">
            <Link
              href={`/items/${item.id}/label`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-[15px] text-[15px] font-semibold text-ink no-underline"
            >
              <span className="material-symbols-rounded text-lg">print</span>
              Print label
            </Link>
            <a
              href="#care"
              className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-accent px-4 py-[15px] text-[15px] font-semibold text-white no-underline"
            >
              <span className="material-symbols-rounded text-lg">build</span>
              Log service
            </a>
          </div>

          <StatStrip stats={summaryStats(item, lastCare)} />

          <ItemDetailsCard
            rows={rows}
            startEditing={edit === "1"}
            item={item}
            locations={locations}
            labels={labels}
            otherItems={otherItems}
            selectedLabelIds={selectedLabelIds}
          />

          {childItems.length > 0 && (
            <Card title="Contains">
              <ul className="m-0 flex list-none flex-col p-0 pb-2">
                {childItems.map((child) => (
                  <li key={child.id} className="border-b border-border/40 last:border-b-0">
                    <Link href={`/items/${child.id}`} className="block py-2 text-[13px] font-medium text-ink no-underline hover:text-accent">
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="grid gap-[14px] lg:grid-cols-2">
            <Card id="attachments" title="Attachments">
              <AttachmentsSection itemId={item.id} attachments={attachmentsWithUrls} />
            </Card>
            <Card id="care" title="Care history">
              <MaintenanceSection itemId={item.id} itemCurrency={item.currency} entries={maintenanceEntries} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
