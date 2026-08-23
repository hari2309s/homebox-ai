import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Google retires model versions quickly — always verify the default still
// resolves to a live endpoint. As of 2026-08, gemini-2.5-flash is the
// current flash-tier model; gemini-2.0-flash and gemini-1.5-flash both
// return 404. Override via GOOGLE_MODEL env var to pin a specific version.
export function createGeminiModel(model = process.env.GOOGLE_MODEL ?? "gemini-2.5-flash") {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not set");
  const chat = new ChatGoogleGenerativeAI({ apiKey, model });

  // @langchain/google-genai@0.1.x does not expose thinkingConfig in its
  // constructor. Gemini 2.5+ models have thinking enabled by default, which
  // can push vision/structured-output calls past Vercel's 60 s function limit.
  // Patch it directly onto the underlying GenerativeModel's generationConfig
  // (a public property on the @google/generative-ai client object).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gc = (chat as any).client?.generationConfig;
  if (gc) gc.thinkingConfig = { thinkingBudget: 0 };

  return chat;
}
