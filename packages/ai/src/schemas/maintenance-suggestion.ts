import { z } from "zod";

export const maintenanceSuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      name: z.string().describe("Short maintenance task name, e.g. 'Replace filter'"),
      recommendedDate: z.string().describe("ISO date this should be done by"),
      reason: z.string().describe("Why this is being suggested (age, warranty, typical service interval)"),
    }),
  ),
  warrantyExpiringSoon: z.boolean(),
});

export type MaintenanceSuggestion = z.infer<typeof maintenanceSuggestionSchema>;
