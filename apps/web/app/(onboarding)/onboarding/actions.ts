"use server";

import { locationQueries } from "@homebox-ai/db";
import { createSupabaseServerClient, requireSessionUser } from "@homebox-ai/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { locationTag } from "../../../lib/cached-queries";
import { isPlotSize } from "../../../lib/onboarding";
import { clampToPlot, inferKind, isPlanKind, layoutPlan } from "../../../lib/plan-layout";

async function updateMetadata(data: Record<string, unknown>) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ data });
  if (error) throw new Error(error.message);
}

export async function saveHouseholdAction(input: { name: string; plotSize: string }) {
  await requireSessionUser();
  const name = String(input.name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 60);
  if (!name) throw new Error("Give your place a name");
  await updateMetadata({ household_name: name, plot_size: isPlotSize(input.plotSize) ? input.plotSize : null });
  revalidatePath("/", "layout");
}

/** Creates the zones picked in onboarding, already drawn on the plan (skipping any that exist by name). */
export async function createZonesAction(zones: { name: string; kind: string }[]) {
  const user = await requireSessionUser();
  if (!Array.isArray(zones) || zones.length > 30) throw new Error("Pick up to 30 zones");

  const existing = await locationQueries.listLocations(user.id);
  const taken = new Set(existing.map((l) => l.name.toLowerCase()));
  const wanted = zones
    .map((z) => ({
      name: String(z.name ?? "")
        .trim()
        .slice(0, 60),
      kind: String(z.kind ?? ""),
    }))
    .filter((z) => z.name && !taken.has(z.name.toLowerCase()))
    .filter((z, i, all) => all.findIndex((o) => o.name.toLowerCase() === z.name.toLowerCase()) === i);
  if (wanted.length === 0) return;

  const drafts = wanted.map((z, i) => ({
    id: `new-${i}`,
    name: z.name,
    parentId: null,
    planKind: isPlanKind(z.kind) ? z.kind : inferKind(z.name, null),
    planX: null,
    planY: null,
    planW: null,
    planH: null,
  }));
  const placed = layoutPlan([...existing, ...drafts]);

  for (const draft of drafts) {
    const rect = clampToPlot(placed.find((p) => p.id === draft.id)!.rect);
    await locationQueries.createLocation(user.id, {
      name: draft.name,
      parentId: null,
      planKind: draft.planKind,
      planX: Math.round(rect.x),
      planY: Math.round(rect.y),
      planW: Math.round(rect.w),
      planH: Math.round(rect.h),
    });
  }
  revalidateTag(locationTag(user.id));
  revalidatePath("/", "layout");
}

export async function completeOnboardingAction() {
  await requireSessionUser();
  await updateMetadata({ onboarded_at: new Date().toISOString() });
  revalidatePath("/", "layout");
}
