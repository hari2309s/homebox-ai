"use client";

import { Input, SubmitButton } from "@homebox-ai/ui";
import { useState } from "react";

import { addMaintenanceEntryAction, deleteMaintenanceEntryAction, updateMaintenanceEntryAction } from "../actions";

interface MaintenanceEntry {
  id: string;
  date: string;
  name: string;
  description: string | null;
  cost: string | null;
}

export function MaintenanceSection({ itemId, entries }: { itemId: string; entries: MaintenanceEntry[] }) {
  return (
    <div className="flex flex-col gap-3">
      {entries.length === 0 ? (
        <p className="text-sm text-muted">No maintenance logged yet.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {entries.map((entry) => (
            <MaintenanceRow key={entry.id} itemId={itemId} entry={entry} />
          ))}
        </ul>
      )}

      <form action={addMaintenanceEntryAction} className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
        <input type="hidden" name="itemId" value={itemId} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input name="name" placeholder="What was done" required className="sm:flex-1" />
          <Input name="date" type="date" required />
          <Input name="cost" placeholder="Cost" className="sm:w-24" />
        </div>
        <Input name="description" placeholder="Notes (optional)" />
        <SubmitButton className="self-start">Add entry</SubmitButton>
      </form>
    </div>
  );
}

function MaintenanceRow({ itemId, entry }: { itemId: string; entry: MaintenanceEntry }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li>
        <form
          action={async (formData) => {
            await updateMaintenanceEntryAction(formData);
            setEditing(false);
          }}
          className="flex flex-col gap-2 rounded-md border border-border bg-white p-3"
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
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="cursor-pointer border-none bg-transparent text-sm font-semibold text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-2 rounded-md border border-border bg-white px-3 py-2.5">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-ink">{entry.name}</span>
        <span className="text-xs text-muted">
          {entry.date}
          {entry.cost ? ` · $${entry.cost}` : ""}
        </span>
        {entry.description && <span className="text-sm text-body">{entry.description}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="cursor-pointer border-none bg-transparent font-semibold text-ink"
        >
          Edit
        </button>
        <form
          action={async (formData) => {
            if (!confirm(`Delete "${entry.name}"?`)) return;
            await deleteMaintenanceEntryAction(formData);
          }}
        >
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="entryId" value={entry.id} />
          <button type="submit" className="cursor-pointer border-none bg-transparent font-semibold text-accent-hover">
            Delete
          </button>
        </form>
      </div>
    </li>
  );
}
