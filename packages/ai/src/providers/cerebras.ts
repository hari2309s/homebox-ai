import { ChatOpenAI } from "@langchain/openai";

// Cerebras's model lineup changes over time (verified against GET
// /v1/models — a previously-hardcoded "llama-3.3-70b" here had already been
// retired) — keep it env-configurable rather than a fixed constant.
export function createCerebrasModel(model = process.env.CEREBRAS_MODEL ?? "gpt-oss-120b") {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) throw new Error("CEREBRAS_API_KEY is not set");
  return new ChatOpenAI({
    apiKey,
    model,
    configuration: { baseURL: "https://api.cerebras.ai/v1" },
  });
}
