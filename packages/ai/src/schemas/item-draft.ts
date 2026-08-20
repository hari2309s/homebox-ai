import { z } from "zod";

// Mirrors the insertable fields of packages/db's `items` table, minus
// `ownerId`/`id` (assigned server-side) and `locationId` (resolved from the
// suggested location name after the user confirms it in the review UI).
// Free-text rather than a strict enum — the model reports whatever currency
// symbol/code it actually sees (e.g. "₹" -> "INR", "kr" -> "SEK"); the UI
// layer (apps/web/lib/currency.ts's normalizeCurrency) is what falls back to
// a supported default if this doesn't match one of the ones the app offers.
const currencyField = z
  .string()
  .optional()
  .describe("ISO 4217 currency code inferred from a price symbol/text if visible (e.g. USD, EUR, GBP, INR)");

export const itemDraftSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  purchasePrice: z.string().optional().describe("Decimal string, e.g. '129.99'"),
  currency: currencyField,
  purchaseDate: z.string().optional().describe("ISO date, e.g. '2024-03-01'"),
  suggestedLabel: z.string().optional().describe("Best-guess label/category name"),
  suggestedLocation: z.string().optional().describe("Best-guess location name"),
});

export type ItemDraft = z.infer<typeof itemDraftSchema>;

export const receiptDraftSchema = z.object({
  items: z.array(itemDraftSchema),
  merchant: z.string().optional(),
  purchaseDate: z.string().optional().describe("ISO date the receipt was dated"),
  currency: currencyField,
});

export type ReceiptDraft = z.infer<typeof receiptDraftSchema>;
