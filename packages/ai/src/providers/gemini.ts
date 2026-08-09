import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export function createGeminiModel(model = "gemini-1.5-flash") {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not set");
  return new ChatGoogleGenerativeAI({ apiKey, model });
}
