import { ChatOpenAI } from "@langchain/openai";

// OpenRouter's free-model lineup changes over time — verified against their
// live /api/v1/models endpoint (the previous default,
// meta-llama/llama-3.2-11b-vision-instruct:free, no longer exists). Free-tier
// vision models here can also have real cold-start latency (seen 30-45s+ on
// first request) since they're routed to lower-priority community compute —
// that's expected, not a hang.
//
// No default here on purpose: this provider backs OpenRouter's fallback slot
// in every task chain (vision, chat_tools, reasoning) in router.ts, and those
// tasks need different models (a vision-capable one vs. a tool-calling-
// capable one) — a single implicit default would silently point the wrong
// model at whichever task didn't ask for one explicitly. Callers pass the
// task-appropriate model; see router.ts.
export function createOpenRouterModel(model: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  return new ChatOpenAI({
    apiKey,
    model,
    configuration: { baseURL: "https://openrouter.ai/api/v1" },
  });
}
