import { z } from "zod";

// Mirrors the insertable fields of packages/db's `items` table, minus
// `ownerId`/`id` (assigned server-side) and `locationId` (resolved from the
// suggested location name after the user confirms it in the review UI).
export const itemDraftSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  purchasePrice: z.string().optional().describe("Decimal string, e.g. '129.99'"),
  purchaseDate: z.string().optional().describe("ISO date, e.g. '2024-03-01'"),
  suggestedLabel: z.string().optional().describe("Best-guess label/category name"),
  suggestedLocation: z.string().optional().describe("Best-guess location name"),
});

export type ItemDraft = z.infer<typeof itemDraftSchema>;

export const receiptDraftSchema = z.object({
  items: z.array(itemDraftSchema),
  merchant: z.string().optional(),
  purchaseDate: z.string().optional().describe("ISO date the receipt was dated"),
});

export type ReceiptDraft = z.infer<typeof receiptDraftSchema>;
