"use client";

import { ConfirmDialog, EmptyState, Input, SubmitButton, TapButton } from "@homebox-ai/ui";
import { useState } from "react";

import { toastLabelDeleted, toastLabelUpdated } from "../notifications/use-notifications";
import { deleteLabelAction, updateLabelAction } from "./actions";

interface LabelRecord {
  id: string;
  name: string;
  color: string | null;
}

function textColorFor(hex: string | null): string {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return "#1f2622";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1f2622" : "#ffffff";
}

function chipBgFor(hex: string | null): string {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return "#e9e8e1";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.18)`;
}

export function LabelList({ labels }: { labels: LabelRecord[] }) {
  if (labels.length === 0) {
    return <EmptyState>No labels yet — add your first one below.</EmptyState>;
  }

  return (
    <div className="rounded-[14px] border border-border bg-card p-4 shadow-card">
      <div className="flex flex-wrap gap-2">
        {labels.map((label) => (
          <LabelChip key={label.id} label={label} />
        ))}
      </div>
    </div>
  );
}

function LabelChip({ label }: { label: LabelRecord }) {
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textColor = textColorFor(label.color);
  const chipBg = label.color ? chipBgFor(label.color) : "#e9e8e1";

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    const formData = new FormData();
    formData.set("id", label.id);
    try {
      await deleteLabelAction(formData);
      toastLabelDeleted(label.name);
      setConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this label");
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <div className="flex w-full flex-col gap-2">
        <div className="rounded-[14px] border-2 border-accent bg-selected-soft p-[10px]">
          <div className="font-mono text-[10px] text-accent">EDITING</div>
          <form
            action={async (formData) => {
              setError(null);
              try {
                await updateLabelAction(formData);
                toastLabelUpdated(String(formData.get("name") ?? ""));
                setEditing(false);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Couldn't save that change");
              }
            }}
            className="mt-2 flex items-center gap-[6px]"
          >
            <input type="hidden" name="id" value={label.id} />
            <Input name="name" defaultValue={label.name} required className="h-8 flex-1 !rounded-[9px] text-sm" />
            <input
              type="color"
              name="color"
              defaultValue={label.color ?? "#3f6b45"}
              aria-label="Label color"
              className="h-7 w-8 shrink-0 cursor-pointer rounded-full border-none bg-transparent p-0"
            />
            <SubmitButton className="!h-8 !rounded-[9px] !px-3 text-xs">Save</SubmitButton>
            <TapButton
              type="button"
              onClick={() => setEditing(false)}
              className="cursor-pointer border-none bg-transparent text-xs font-semibold text-ink"
            >
              Cancel
            </TapButton>
          </form>
          <div className="mt-2 flex items-center gap-1">
            <TapButton
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="cursor-pointer border-none bg-transparent text-xs font-semibold text-clay"
            >
              Delete label
            </TapButton>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-xs text-danger">{error}</p>
        )}
        <ConfirmDialog
          open={confirmOpen}
          title={`Delete label "${label.name}"?`}
          confirmLabel="Delete"
          confirming={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex cursor-pointer items-center gap-[7px] rounded-full border-none py-[7px] pl-3 pr-2 text-[14px] font-semibold"
      style={{ background: chipBg, color: label.color ? textColor : "#1f2622" }}
    >
      {label.color && (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: label.color }} />
      )}
      {label.name}
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full bg-white/60"
        onClick={(e) => {
          e.stopPropagation();
          setConfirmOpen(true);
        }}
      >
        <span className="material-symbols-rounded text-[14px]">close</span>
      </span>
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete label "${label.name}"?`}
        confirmLabel="Delete"
        confirming={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </button>
  );
}
