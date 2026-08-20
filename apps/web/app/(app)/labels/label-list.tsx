"use client";

import { ConfirmDialog, EmptyState, Input, StaggerItem, StaggerList, SubmitButton, TapButton } from "@homebox-ai/ui";
import { useState } from "react";

import { deleteLabelAction, updateLabelAction } from "./actions";

interface LabelRecord {
  id: string;
  name: string;
  color: string | null;
}

// Simple relative-luminance check so chip text stays readable against
// whatever custom color the user picked, instead of assuming light or dark.
function textColorFor(hex: string | null): string | undefined {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return undefined;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#4a254b" : "#ffffff";
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const textColor = textColorFor(label.color);

  async function handleDelete() {
    setConfirmOpen(false);
    const formData = new FormData();
    formData.set("id", label.id);
    await deleteLabelAction(formData);
  }

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
          <input
            type="color"
            name="color"
            defaultValue={label.color ?? "#f7deae"}
            aria-label="Label color"
            className="h-7 w-8 shrink-0 cursor-pointer rounded border border-border bg-card p-0.5"
          />
          <SubmitButton className="h-7 px-2.5 py-1 text-xs">Save</SubmitButton>
          <TapButton
            type="button"
            onClick={() => setEditing(false)}
            className="cursor-pointer border-none bg-transparent text-xs font-semibold text-ink"
          >
            Cancel
          </TapButton>
        </form>
      </StaggerItem>
    );
  }

  return (
    <StaggerItem
      hover
      className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ${label.color ? "" : "bg-surface text-ink"}`}
      style={label.color ? { backgroundColor: label.color, color: textColor } : undefined}
    >
      <TapButton
        type="button"
        onClick={() => setEditing(true)}
        className="cursor-pointer border-none bg-transparent p-0 text-sm font-medium"
        style={label.color ? { color: textColor } : undefined}
      >
        {label.name}
      </TapButton>
      <TapButton
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label={`Delete ${label.name}`}
        className="cursor-pointer border-none bg-transparent text-xs opacity-70 hover:opacity-100"
        style={{ color: textColor }}
      >
        ✕
      </TapButton>
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete label "${label.name}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </StaggerItem>
  );
}
