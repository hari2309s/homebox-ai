import { z } from "zod";

// One variant per mutating chat tool in graphs/chat-search.ts. Built by that
// tool (validated against the user's real data — e.g. a referenced location
// must already exist) but never executed there; the API route surfaces it to
// the client as something to confirm, and apps/web's confirmChatActionAction
// is the only place that actually performs the mutation, re-validating this
// same shape since it arrives back from an untrusted client round-trip.
export const pendingActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create_location"),
    summary: z.string(),
    name: z.string(),
    parentLocationId: z.string().nullable().optional(),
  }),
  z.object({
    type: z.literal("create_label"),
    summary: z.string(),
    name: z.string(),
    color: z.string().nullable().optional(),
  }),
  z.object({
    type: z.literal("create_item"),
    summary: z.string(),
    name: z.string(),
    description: z.string().optional(),
    quantity: z.number().int().positive().optional(),
    locationId: z.string().nullable().optional(),
    labelNames: z.array(z.string()).optional(),
    purchasePrice: z.string().optional(),
    purchaseDate: z.string().optional(),
    warrantyExpires: z.string().optional(),
  }),
  z.object({
    type: z.literal("update_item"),
    summary: z.string(),
    itemId: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().int().positive().optional(),
    locationId: z.string().nullable().optional(),
    purchasePrice: z.string().optional(),
    purchaseDate: z.string().optional(),
    warrantyExpires: z.string().optional(),
  }),
  z.object({
    type: z.literal("add_maintenance_entry"),
    summary: z.string(),
    itemId: z.string(),
    name: z.string(),
    date: z.string(),
    description: z.string().optional(),
    cost: z.string().optional(),
  }),
]);

export type PendingAction = z.infer<typeof pendingActionSchema>;
