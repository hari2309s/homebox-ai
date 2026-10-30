"use client";

import { ConfirmDialog, Input, SubmitButton, TapButton } from "@homebox-ai/ui";
import { useState } from "react";

import { formatCurrency } from "../../../../lib/currency";
import { toastMaintenanceLogged } from "../../notifications/use-notifications";
import { addMaintenanceEntryAction, deleteMaintenanceEntryAction, updateMaintenanceEntryAction } from "../actions";

interface MaintenanceEntry {
  id: string;
  date: string;
  name: string;
  description: string | null;
  cost: string | null;
}

export function MaintenanceSection({
  itemId,
  itemCurrency,
  entries,
}: {
  itemId: string;
  itemCurrency: string;
  entries: MaintenanceEntry[];
}) {
  return (
    <div className="flex flex-col gap-3 pb-3">
      {entries.length === 0 ? (
        <p className="m-0 text-[13px] text-muted">No care logged yet.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {entries.map((entry) => (
            <MaintenanceRow key={entry.id} itemId={itemId} itemCurrency={itemCurrency} entry={entry} />
          ))}
        </ul>
      )}

      <form
        action={async (formData) => {
          await addMaintenanceEntryAction(formData);
          toastMaintenanceLogged(String(formData.get("name") ?? ""));
        }}
        className="flex flex-col gap-2 border-t border-border/40 pt-3"
      >
        <input type="hidden" name="itemId" value={itemId} />
        <Input name="name" placeholder="What was done" aria-label="What was done" required />
        <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
          <Input name="date" type="date" aria-label="Date" required className="w-full" />
          <Input name="cost" placeholder="Cost" aria-label="Cost" className="w-full" />
        </div>
        <Input name="description" placeholder="Notes (optional)" aria-label="Notes" />
        <SubmitButton className="self-start">Log care</SubmitButton>
      </form>
    </div>
  );
}

function MaintenanceRow({
  itemId,
  itemCurrency,
  entry,
}: {
  itemId: string;
  itemCurrency: string;
  entry: MaintenanceEntry;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    const formData = new FormData();
    formData.set("itemId", itemId);
    formData.set("entryId", entry.id);
    try {
      await deleteMaintenanceEntryAction(formData);
      setConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this entry");
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-1 py-2">
        <form
          action={async (formData) => {
            setError(null);
            try {
              await updateMaintenanceEntryAction(formData);
              setEditing(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Couldn't save that change");
            }
          }}
          className="flex flex-col gap-2 rounded-[10px] border border-border bg-selected-soft p-3"
        >
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="entryId" value={entry.id} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input name="name" defaultValue={entry.name} required className="sm:flex-1" />
            <Input name="date" type="date" defaultValue={entry.date} required />
            <Input name="cost" defaultValue={entry.cost ?? ""} placeholder="Cost" className="sm:w-24" />
          </div>
          <Input name="description" defaultValue={entry.description ?? ""} placeholder="Notes (optional)" />
          <div className="flex gap-3">
            <SubmitButton>Save</SubmitButton>
            <TapButton
              type="button"
              onClick={() => setEditing(false)}
              className="cursor-pointer border-none bg-transparent text-sm font-semibold text-ink"
            >
              Cancel
            </TapButton>
          </div>
        </form>
        {error && (
          <p role="alert" className="text-sm text-accent-hover">
            {error}
          </p>
        )}
      </li>
    );
  }

  const cost = formatCurrency(entry.cost, itemCurrency);

  return (
    <li className="flex flex-col border-b border-border/40 py-2 last:border-b-0">
      <div className="grid grid-cols-[64px_minmax(0,1fr)_auto_auto] items-center gap-2 text-[13px]">
        <span className="font-mono text-[10px] text-muted">{shortDate(entry.date)}</span>
        <span className="min-w-0 truncate text-ink" title={entry.description ?? entry.name}>
          {entry.name}
        </span>
        <span className="font-mono text-[12px] text-body">{cost ?? ""}</span>
        <span className="flex gap-1">
          <TapButton
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${entry.name}`}
            className="flex cursor-pointer border-none bg-transparent p-0 text-muted hover:text-ink"
          >
            <span className="material-symbols-rounded text-[16px]">edit</span>
          </TapButton>
          <TapButton
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label={`Delete ${entry.name}`}
            className="flex cursor-pointer border-none bg-transparent p-0 text-muted hover:text-clay"
          >
            <span className="material-symbols-rounded text-[16px]">close</span>
          </TapButton>
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm text-clay">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${entry.name}"?`}
        confirmLabel="Delete"
        confirming={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </li>
  );
}

function shortDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "2-digit" }).format(new Date(y, m - 1, d)).toUpperCase();
}
