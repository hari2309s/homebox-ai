import { z } from "zod";

export const maintenanceSuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      name: z.string().describe("Short maintenance task name, e.g. 'Replace filter'"),
      recommendedDate: z.string().describe("ISO date this should be done by"),
      reason: z.string().describe("Why this is being suggested (age, warranty, typical service interval)"),
      weather: z
        .string()
        .nullable()
        .describe(
          "If the forecast shaped this task or its date, one short line saying how (e.g. 'Frost from Tue, so drain it before then'); otherwise null",
        ),
    }),
  ),
  warrantyExpiringSoon: z.boolean(),
});

export type MaintenanceSuggestion = z.infer<typeof maintenanceSuggestionSchema>;
