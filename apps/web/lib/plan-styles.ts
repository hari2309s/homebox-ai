import type { PlanKind } from "./plan-layout";

/** How each kind of place is drawn on the site plan (canvas and read-only previews). */
export const KIND_STYLE: Record<
  PlanKind,
  {
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    /** CSS drop-shadow for raised things (buildings, trees). */
    shadow?: string;
    label: "inside" | "above" | "below" | "center";
  }
> = {
  house: {
    fill: "var(--plan-house)",
    stroke: "var(--plan-house-line)",
    strokeWidth: 2,
    shadow: "drop-shadow(6px 9px 10px rgba(31,38,34,.22))",
    label: "above",
  },
  room: { fill: "var(--plan-house)", stroke: "var(--plan-room-line)", strokeWidth: 1, label: "inside" },
  garden: { fill: "var(--plan-garden)", stroke: "var(--plan-bed-line)", strokeWidth: 1, label: "inside" },
  bed: { fill: "var(--plan-bed)", stroke: "var(--plan-bed-line)", strokeWidth: 1, label: "below" },
  pond: { fill: "#9fc3c9", label: "center" },
  tree: { fill: "#7fa572", shadow: "drop-shadow(4px 6px 6px rgba(31,38,34,.25))", label: "below" },
  garage: {
    fill: "var(--plan-garage)",
    stroke: "var(--plan-garage-line)",
    strokeWidth: 2,
    shadow: "drop-shadow(6px 9px 10px rgba(31,38,34,.22))",
    label: "inside",
  },
  shed: {
    fill: "var(--plan-shed)",
    stroke: "var(--plan-shed-line)",
    strokeWidth: 1,
    shadow: "drop-shadow(4px 5px 7px rgba(31,38,34,.2))",
    label: "inside",
  },
  drive: { fill: "var(--plan-drive)", label: "inside" },
  area: { fill: "var(--plan-area)", stroke: "var(--plan-room-line)", strokeWidth: 1, label: "inside" },
};

export const LABEL_INK: Partial<Record<PlanKind, string>> = {
  garden: "text-(--plan-ink)",
  bed: "text-(--plan-ink)",
  tree: "text-(--plan-ink)",
  garage: "text-(--plan-garage-line)",
  shed: "text-(--plan-shed-ink)",
  house: "text-(--plan-ink)",
  pond: "text-[#1f4a4a]",
};
