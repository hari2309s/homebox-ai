"use client";

import { useState, type ComponentProps } from "react";

import { DetailGrid } from "../item-summary";
import { ItemEditForm } from "./item-edit-form";

type EditFormProps = Omit<ComponentProps<typeof ItemEditForm>, "onSaved" | "onCancel">;

export function ItemDetailsCard({
  rows,
  startEditing,
  ...formProps
}: EditFormProps & { rows: { k: string; v: string }[]; startEditing: boolean }) {
  const [editing, setEditing] = useState(startEditing);

  return (
    <section id="details" className="scroll-mt-6 rounded-[14px] border border-border bg-card px-4 pb-3 pt-1">
      <div className="flex items-center justify-between py-[10px]">
        <h2 className="m-0 font-serif text-[18px] font-normal text-ink">Details</h2>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex cursor-pointer items-center gap-1 rounded-[9px] border border-border bg-card px-[10px] py-[5px] text-[13px] font-semibold text-ink"
          >
            <span className="material-symbols-rounded text-[16px]">edit</span>
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <ItemEditForm {...formProps} onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} />
      ) : (
        <DetailGrid rows={rows} columns={2} />
      )}
    </section>
  );
}
