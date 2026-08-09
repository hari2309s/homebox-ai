import { ChatGroq } from "@langchain/groq";

export function createGroqModel(model = "llama-3.3-70b-versatile") {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");
  return new ChatGroq({ apiKey, model });
}
