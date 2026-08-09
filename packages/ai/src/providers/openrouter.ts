import { ChatOpenAI } from "@langchain/openai";

// OpenRouter's free-model lineup changes over time — never hardcode a model
// id here beyond a fallback default; prefer the env var in real use.
export function createOpenRouterModel(model = process.env.OPENROUTER_VISION_MODEL ?? "meta-llama/llama-3.2-11b-vision-instruct:free") {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  return new ChatOpenAI({
    apiKey,
    model,
    configuration: { baseURL: "https://openrouter.ai/api/v1" },
  });
}
