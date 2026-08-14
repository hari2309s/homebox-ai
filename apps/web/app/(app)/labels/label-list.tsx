"use client";

import { EmptyState, Input, StaggerItem, StaggerList, SubmitButton } from "@homebox-ai/ui";
import { useState } from "react";

import { deleteLabelAction, updateLabelAction } from "./actions";

interface LabelRecord {
  id: string;
  name: string;
}

export function LabelList({ labels }: { labels: LabelRecord[] }) {
  if (labels.length === 0) {
    return <EmptyState>No labels yet — add your first one above.</EmptyState>;
  }

  return (
    <StaggerList className="flex list-none flex-wrap gap-2 p-0 m-0">
      {labels.map((label) => (
        <LabelChip key={label.id} label={label} />
      ))}
    </StaggerList>
  );
}

function LabelChip({ label }: { label: LabelRecord }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <StaggerItem>
        <form
          action={async (formData) => {
            await updateLabelAction(formData);
            setEditing(false);
          }}
          className="flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1"
        >
          <input type="hidden" name="id" value={label.id} />
          <Input name="name" defaultValue={label.name} required className="h-7 w-28 px-2 py-1 text-sm" />
          <SubmitButton className="h-7 px-2.5 py-1 text-xs">Save</SubmitButton>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="cursor-pointer border-none bg-transparent text-xs font-semibold text-ink"
          >
            Cancel
          </button>
        </form>
      </StaggerItem>
    );
  }

  return (
    <StaggerItem className="flex items-center gap-2 rounded-full bg-surface px-3.5 py-1.5 text-sm font-medium text-ink">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="cursor-pointer border-none bg-transparent p-0 text-sm font-medium text-ink"
      >
        {label.name}
      </button>
      <form
        action={async (formData) => {
          if (!confirm(`Delete label "${label.name}"?`)) return;
          await deleteLabelAction(formData);
        }}
      >
        <input type="hidden" name="id" value={label.id} />
        <button
          type="submit"
          aria-label={`Delete ${label.name}`}
          className="cursor-pointer border-none bg-transparent text-xs text-muted hover:text-accent-hover"
        >
          ✕
        </button>
      </form>
    </StaggerItem>
  );
}
