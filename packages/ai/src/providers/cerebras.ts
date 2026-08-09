import { ChatOpenAI } from "@langchain/openai";

export function createCerebrasModel(model = "llama-3.3-70b") {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) throw new Error("CEREBRAS_API_KEY is not set");
  return new ChatOpenAI({
    apiKey,
    model,
    configuration: { baseURL: "https://api.cerebras.ai/v1" },
  });
}
