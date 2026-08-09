import { ChatOpenAI } from "@langchain/openai";

// OpenRouter's free-model lineup changes over time — verified against their
// live /api/v1/models endpoint (the previous default,
// meta-llama/llama-3.2-11b-vision-instruct:free, no longer exists). Free-tier
// vision models here can also have real cold-start latency (seen 30-45s+ on
// first request) since they're routed to lower-priority community compute —
// that's expected, not a hang.
export function createOpenRouterModel(model = process.env.OPENROUTER_VISION_MODEL ?? "google/gemma-4-31b-it:free") {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  return new ChatOpenAI({
    apiKey,
    model,
    configuration: { baseURL: "https://openrouter.ai/api/v1" },
  });
}
