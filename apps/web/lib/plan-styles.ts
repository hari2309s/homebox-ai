import type { CSSProperties } from "react";

import type { PlanKind } from "./plan-layout";

/** How each kind of place is drawn on the site plan (canvas and read-only previews). */
export const KIND_STYLE: Record<
  PlanKind,
  { className: string; style?: CSSProperties; label: "inside" | "above" | "below" | "center" }
> = {
  house: {
    className:
      "border-2 border-(--plan-house-line) bg-(--plan-house) rounded-[4px] shadow-[14px_18px_28px_-14px_rgba(31,38,34,.4)]",
    label: "above",
  },
  room: { className: "border border-(--plan-room-line) bg-(--plan-house)", label: "inside" },
  garden: { className: "border border-(--plan-bed-line) bg-(--plan-garden) rounded-[10px]", label: "inside" },
  bed: { className: "border border-(--plan-bed-line) bg-(--plan-bed) rounded-md", label: "below" },
  pond: { className: "bg-[#9fc3c9] text-[#1f4a4a]", style: { borderRadius: "50% 45% 55% 40%" }, label: "center" },
  tree: { className: "rounded-full bg-[#7fa572] shadow-[8px_10px_14px_-6px_rgba(31,38,34,.35)]", label: "below" },
  garage: {
    className:
      "border-2 border-(--plan-garage-line) bg-(--plan-garage) rounded-[4px] shadow-[14px_18px_28px_-14px_rgba(31,38,34,.4)]",
    label: "inside",
  },
  shed: {
    className:
      "border border-(--plan-shed-line) bg-(--plan-shed) rounded-md shadow-[8px_10px_18px_-10px_rgba(31,38,34,.35)]",
    label: "inside",
  },
  drive: { className: "bg-(--plan-drive) rounded-[4px]", label: "inside" },
  area: { className: "border border-(--plan-room-line) bg-(--plan-area) rounded-md", label: "inside" },
};

export const LABEL_INK: Partial<Record<PlanKind, string>> = {
  garden: "text-(--plan-ink)",
  bed: "text-(--plan-ink)",
  tree: "text-(--plan-ink)",
  garage: "text-(--plan-garage-line)",
  shed: "text-(--plan-shed-ink)",
  house: "text-(--plan-ink)",
};
