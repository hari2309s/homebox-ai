import { ChatGroq } from "@langchain/groq";

// Groq's model lineup changes over time (verified against GET
// /openai/v1/models — the previously-hardcoded "llama-3.3-70b-versatile" had
// already been retired, returning a 404 model_not_found on every call) — keep
// it env-configurable rather than a fixed constant, matching cerebras.ts.
export function createGroqModel(model = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b") {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");
  return new ChatGroq({ apiKey, model });
}
