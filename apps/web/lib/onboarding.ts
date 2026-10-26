import type { PlanKind } from "./plan-layout";

export const PLOT_SIZES = [
  { id: "small", label: "Small garden", detail: "UNDER 1/4 ACRE", size: 34 },
  { id: "quarter", label: "Quarter acre", detail: "1/4–1/2 ACRE", size: 44 },
  { id: "big", label: "Big plot", detail: "1/2 ACRE +", size: 54 },
] as const;

export type PlotSize = (typeof PLOT_SIZES)[number]["id"];

export function isPlotSize(value: unknown): value is PlotSize {
  return PLOT_SIZES.some((p) => p.id === value);
}

export interface ZoneOption {
  name: string;
  kind: PlanKind;
  color: string;
  locked?: boolean;
}

/** J7 #43's zone tiles — each maps to a real plan kind so the zone draws on the canvas the same way. */
export const ZONE_OPTIONS: ZoneOption[] = [
  { name: "House", kind: "house", color: "#c5c9bf", locked: true },
  { name: "Garden", kind: "garden", color: "#3f6b45" },
  { name: "Garage", kind: "garage", color: "#b0643f" },
  { name: "Shed", kind: "shed", color: "#8a7a4f" },
  { name: "Fish pond", kind: "pond", color: "#3f8a8a" },
  { name: "Orchard", kind: "tree", color: "#d9a43a" },
  { name: "Driveway", kind: "drive", color: "#9aa49c" },
  { name: "Greenhouse", kind: "shed", color: "#7fa572" },
];

export const DEFAULT_ZONES = ["House", "Garden"];

export interface OnboardingMeta {
  onboarded_at?: unknown;
  pending_join?: unknown;
  household_name?: unknown;
}

/**
 * First-run onboarding is for a brand-new owner only: never onboarded, nothing logged, not part of a
 * shared household and not on their way into one via an invite.
 */
export function needsOnboarding(
  meta: OnboardingMeta | undefined,
  counts: { places: number; things: number; householdSize: number },
): boolean {
  if (meta?.onboarded_at || meta?.pending_join) return false;
  return counts.places === 0 && counts.things === 0 && counts.householdSize <= 1;
}
