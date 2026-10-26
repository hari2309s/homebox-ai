import { itemLabelQueries, itemQueries } from "@homebox-ai/db";
import Link from "next/link";

import { listLabelsCached, listLocationsCached } from "../../../lib/cached-queries";
import { LABEL_SWATCHES, labelChip } from "../../../lib/label-colors";
import { locationPath, stripeFor, zoneIndexOf } from "../items/item-summary";
import { LabelPane } from "./label-pane";
import { Input, SubmitButton } from "@homebox-ai/ui";

import { getSessionUser } from "@homebox-ai/supabase/server";

import { createLabelAction } from "./actions";
import { CrudShell } from "../crud-shell";
import { LabelList } from "./label-list";

export default async function LabelsPage({ searchParams }: { searchParams: Promise<{ selected?: string }> }) {
  const [{ selected }, user] = await Promise.all([searchParams, getSessionUser()]);
  const [labels, links, items, locations] = user
    ? await Promise.all([
        listLabelsCached(user.id),
        itemLabelQueries.listAllItemLabelsForUser(user.id),
        itemQueries.searchItems(user.id, { includeArchived: true }),
        listLocationsCached(user.id),
      ])
    : [[], [], [], []];

  const nextColor = (LABEL_SWATCHES[labels.length % LABEL_SWATCHES.length] ?? LABEL_SWATCHES[0]).bg;
  const countByLabel = new Map<string, number>();
  for (const link of links) countByLabel.set(link.labelId, (countByLabel.get(link.labelId) ?? 0) + 1);
  const sortedLabels = [...labels].sort((a, b) => a.name.localeCompare(b.name));
  const active = sortedLabels.find((l) => l.id === selected) ?? sortedLabels[0];

  const itemById = new Map(items.map((i) => [i.id, i]));
  const tagged = active
    ? links
        .filter((link) => link.labelId === active.id)
        .map((link) => itemById.get(link.itemId))
        .filter((item): item is NonNullable<typeof item> => !!item)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const placeOf = (locationId: string | null) =>
    locationPath(locations, locationId)
      .map((l) => l.name)
      .join(" › ");
  const placeCounts = new Map<string, number>();
  for (const item of tagged) {
    const place = placeOf(item.locationId);
    if (place) placeCounts.set(place, (placeCounts.get(place) ?? 0) + 1);
  }
  const commonPlace = [...placeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const summary = `ON ${tagged.length} ${tagged.length === 1 ? "THING" : "THINGS"}${commonPlace ? ` · MOSTLY ${commonPlace.toUpperCase()}` : ""}`;

  return (
    <>
      <div className="hidden h-full lg:flex">
        <div className="flex w-[440px] flex-none flex-col gap-3 border-r border-border px-5 pt-6">
          <div>
            <h1 className="m-0 font-serif text-[30px] font-normal leading-none text-ink">Labels</h1>
            <div className="mt-1 font-mono text-[10px] text-muted">
              {labels.length} {labels.length === 1 ? "LABEL" : "LABELS"} · CUT ACROSS PLACES
            </div>
          </div>
          <form
            action={createLabelAction}
            className="flex items-center gap-2 rounded-[10px] border border-border bg-card px-3 focus-within:border-accent"
          >
            <span aria-hidden className="material-symbols-rounded text-[20px] text-muted">
              add
            </span>
            <input type="hidden" name="color" value={nextColor} />
            <input
              name="name"
              required
              placeholder="New label…"
              aria-label="New label name"
              className="h-10 min-w-0 flex-1 border-none bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
            />
          </form>
          <div className="min-h-0 flex-1 overflow-y-auto pb-6">
            {sortedLabels.length === 0 ? (
              <p className="m-0 px-1 text-[13px] text-muted">No labels yet. Type a name above and press Enter.</p>
            ) : (
              <div className="overflow-hidden rounded-[14px] border border-border bg-card py-[2px]">
                {sortedLabels.map((label) => {
                  const chip = labelChip(label.color);
                  const isActive = label.id === active?.id;
                  return (
                    <Link
                      key={label.id}
                      href={`/labels?selected=${label.id}`}
                      scroll={false}
                      replace
                      aria-current={isActive ? "true" : undefined}
                      className={`flex items-center gap-[10px] border-b border-border/40 px-3 py-[9px] no-underline last:border-b-0 ${
                        isActive
                          ? "bg-selected-soft shadow-[inset_3px_0_0_var(--color-accent)]"
                          : "hover:bg-selected-soft/60"
                      }`}
                    >
                      <span
                        className="truncate rounded-full px-[10px] py-1 text-[12px] font-semibold"
                        style={{ background: chip.bg, color: chip.ink }}
                      >
                        {label.name}
                      </span>
                      <span className="flex-1" />
                      <span className="font-mono text-[12px] text-body">{countByLabel.get(label.id) ?? 0}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto px-7 py-6">
          {active ? (
            <LabelPane
              key={active.id}
              id={active.id}
              name={active.name}
              color={active.color}
              summary={summary}
              things={tagged.map((item) => ({
                id: item.id,
                name: item.name,
                place: placeOf(item.locationId) || "No place",
                stripe: stripeFor(zoneIndexOf(locations, item.locationId)),
              }))}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <div className="font-serif text-[24px] text-ink">No labels yet</div>
              <p className="m-0 max-w-sm text-[13px] text-muted">
                Labels cut across places, like Outdoor, Kids or Warranty.
              </p>
            </div>
          )}
        </div>
      </div>

      <div data-scroll-container className="flex h-full flex-col overflow-y-auto lg:hidden">
        <div className="flex flex-col gap-3 p-4 pb-0">
          <div className="px-1">
            <div className="font-serif text-[30px] leading-none text-ink">Labels</div>
            <div className="mt-1 font-mono text-[11px] tracking-wide text-muted">
              {labels.length} LABEL{labels.length === 1 ? "" : "S"} · TAP TO EDIT
            </div>
          </div>
        </div>

        <CrudShell
          toggleLabel="Add label"
          formAction={createLabelAction}
          formClassName="flex flex-col gap-2"
          formFields={
            <>
              <div className="font-mono text-[10px] text-muted">NEW LABEL</div>
              <div className="grid grid-cols-[1fr_44px] gap-[6px]">
                <Input name="name" placeholder="e.g. Greenhouse" required />
                <SubmitButton className="!rounded-[10px] !px-0">
                  <span className="material-symbols-rounded text-[18px]">add</span>
                </SubmitButton>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-body">Colour</span>
                <input
                  type="color"
                  name="color"
                  defaultValue="#3f6b45"
                  aria-label="Label color"
                  className="h-[26px] w-[26px] shrink-0 cursor-pointer rounded-full border-none bg-transparent p-0"
                />
              </div>
            </>
          }
        >
          <LabelList labels={labels} />
        </CrudShell>
      </div>
    </>
  );
}
