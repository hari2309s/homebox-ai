import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Google's model lineup moves fast — a previously-hardcoded "gemini-1.5-flash"
// here had already been retired (404 on generateContent). Default to the
// "-latest" alias, which Google keeps pointed at their current recommended
// flash-tier model, rather than a dated version string that will go stale
// the same way; still overridable via env for anyone who wants to pin one.
export function createGeminiModel(model = process.env.GOOGLE_MODEL ?? "gemini-flash-latest") {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not set");
  return new ChatGoogleGenerativeAI({ apiKey, model });
}
