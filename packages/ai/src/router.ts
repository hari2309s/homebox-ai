import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

import { createCerebrasModel } from "./providers/cerebras";
import { createGeminiModel } from "./providers/gemini";
import { createGroqModel } from "./providers/groq";
import { createOpenRouterModel } from "./providers/openrouter";

export type TaskType = "vision" | "chat_tools" | "reasoning";

/**
 * Task -> ordered provider factories. Not hardcoded fallback logic: this is a
 * plain config object precisely so the order is easy to change without
 * touching the graphs that consume it. See the project plan's AI
 * Orchestration section for why each order was chosen.
 */
const TASK_PROVIDER_CHAINS: Record<TaskType, Array<() => BaseChatModel>> = {
  vision: [createGeminiModel, createOpenRouterModel],
  chat_tools: [createGroqModel, createCerebrasModel, createOpenRouterModel],
  reasoning: [createCerebrasModel, createGroqModel, createOpenRouterModel],
};

/**
 * Returns a single model whose `.invoke()`/`.stream()` transparently retries
 * the next provider in the task's chain on error (bad key, rate limit, quota
 * exhausted), via LangChain's `.withFallbacks()`.
 */
export function getModelForTask(task: TaskType): BaseChatModel {
  const factories = TASK_PROVIDER_CHAINS[task];

  // Each factory throws synchronously if its own API key is missing. Build
  // the chain from whichever providers are actually configured, in priority
  // order, rather than letting one missing fallback key take down providers
  // ahead of it in the chain (which .map() would do).
  const available: BaseChatModel[] = [];
  for (const factory of factories) {
    try {
      available.push(factory());
    } catch {
      // Not configured — skip it.
    }
  }

  const [primary, ...fallbacks] = available;
  if (!primary) throw new Error(`No providers configured for task "${task}"`);
  return fallbacks.length > 0 ? (primary.withFallbacks(fallbacks) as unknown as BaseChatModel) : primary;
}
