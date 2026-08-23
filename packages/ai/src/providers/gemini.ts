import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Google retires model versions quickly — always verify the default still
// resolves to a live endpoint. As of 2026-08, gemini-2.5-flash is the
// current flash-tier model; gemini-2.0-flash and gemini-1.5-flash both
// return 404. Override via GOOGLE_MODEL env var to pin a specific version.
export function createGeminiModel(model = process.env.GOOGLE_MODEL ?? "gemini-2.5-flash") {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not set");
  return new ChatGoogleGenerativeAI({ apiKey, model });
}
