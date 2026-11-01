import { z } from "zod";

// Mirrors the insertable fields of packages/db's `items` table, minus
// `ownerId`/`id` (assigned server-side) and `locationId` (resolved from the
// suggested location name after the user confirms it in the review UI).
// Free-text rather than a strict enum — the model reports whatever currency
// symbol/code it actually sees (e.g. "₹" -> "INR", "kr" -> "SEK"); the UI
// layer (apps/web/lib/currency.ts's normalizeCurrency) is what falls back to
// a supported default if this doesn't match one of the ones the app offers.
//
// A factory, not a shared constant: reusing one schema instance in both
// itemDraftSchema and receiptDraftSchema makes the JSON-schema conversion
// emit a "$ref" for the second use, which Gemini's response_schema rejects
// (400 "Unknown name \"$ref\"").
const currencyField = () =>
  z
    .string()
    .optional()
    .describe("ISO 4217 currency code inferred from a price symbol/text if visible (e.g. USD, EUR, GBP, INR)");

export const itemDraftSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  // .min(1) rather than .positive(): positive() compiles to JSON Schema's
  // exclusiveMinimum, which Gemini's function-calling schema parser rejects
  // outright (400 "Unknown name \"exclusiveMinimum\""). min(1) is equivalent
  // for an integer and compiles to the widely-supported `minimum` keyword.
  quantity: z.number().int().min(1).default(1),
  purchasePrice: z.string().optional().describe("Decimal string, e.g. '129.99'"),
  currency: currencyField(),
  purchaseDate: z.string().optional().describe("ISO date, e.g. '2024-03-01'"),
  suggestedLabel: z.string().optional().describe("Best-guess label/category name"),
  suggestedLocation: z.string().optional().describe("Best-guess location name"),
});

export type ItemDraft = z.infer<typeof itemDraftSchema>;

export const receiptDraftSchema = z.object({
  items: z.array(itemDraftSchema),
  merchant: z.string().optional(),
  purchaseDate: z.string().optional().describe("ISO date the receipt was dated"),
  currency: currencyField(),
});

export type ReceiptDraft = z.infer<typeof receiptDraftSchema>;

// Room-scan: multi-item extraction from a photo of a space/room.
// Each item includes a bounding box (percentage coords) and confidence level.
// Factory pattern avoids $ref issues with Gemini (see currencyField comment).
const roomScanItemSchema = () =>
  z.object({
    name: z.string().min(1).describe("Short, recognisable item name"),
    description: z.string().optional().describe("Brief visual description (colour, size, material)"),
    quantity: z.number().int().min(1).default(1),
    suggestedLabel: z.string().optional().describe("Best-guess category, e.g. 'Power tools'"),
    suggestedLocation: z.string().optional().describe("Where in the space, e.g. 'Pegboard', 'Shelf'"),
    confidence: z
      .enum(["high", "medium", "unsure"])
      .describe("How confident the detection is"),
    boundingBox: z.object({
      x: z.number().min(0).describe("Left edge as percentage of image width, 0-100"),
      y: z.number().min(0).describe("Top edge as percentage of image height, 0-100"),
      w: z.number().min(0).describe("Width as percentage of image width"),
      h: z.number().min(0).describe("Height as percentage of image height"),
    }).describe("Bounding rectangle in percentage coordinates"),
  });

export const roomScanDraftSchema = z.object({
  items: z.array(roomScanItemSchema()),
  spaceName: z.string().optional().describe("Best-guess name for the space, e.g. 'Garage', 'Kitchen pantry'"),
});

export type RoomScanDraft = z.infer<typeof roomScanDraftSchema>;
export type RoomScanItem = z.infer<ReturnType<typeof roomScanItemSchema>>;
