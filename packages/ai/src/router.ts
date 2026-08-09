import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import type { Runnable } from "@langchain/core/runnables";
import type { z } from "zod";

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
 * Ordered list of the providers actually configured (API key present) for a
 * task, in priority order. Each factory throws synchronously if its own key
 * is missing — that's caught and skipped here so one missing fallback key
 * doesn't take down providers ahead of it in the chain.
 *
 * Exposed separately from `getModelForTask` because `.withFallbacks()`
 * (used there) returns a `RunnableWithFallbacks` that only implements the
 * base `Runnable` interface — callers that need chat-model-specific methods
 * (`.bindTools()` for tool-calling agents, `.withStructuredOutput()` for
 * structured extraction) must call those on each model in this list *before*
 * composing fallbacks themselves. See `getStructuredModelForTask` below and
 * `graphs/chat-search.ts` for the two ways this list gets used.
 */
export function getModelListForTask(task: TaskType): BaseChatModel[] {
  const factories = TASK_PROVIDER_CHAINS[task];
  const available: BaseChatModel[] = [];
  for (const factory of factories) {
    try {
      available.push(factory());
    } catch {
      // Not configured — skip it.
    }
  }
  return available;
}

/**
 * Returns a single model whose `.invoke()`/`.stream()` transparently retries
 * the next provider in the task's chain on error (bad key, rate limit, quota
 * exhausted), via LangChain's `.withFallbacks()`. Only suitable for plain
 * invoke/stream use — see `getModelListForTask`'s doc comment for why
 * tool-calling or structured-output callers need a different composition.
 */
export function getModelForTask(task: TaskType): BaseChatModel {
  const [primary, ...fallbacks] = getModelListForTask(task);
  if (!primary) throw new Error(`No providers configured for task "${task}"`);
  return fallbacks.length > 0 ? (primary.withFallbacks(fallbacks) as unknown as BaseChatModel) : primary;
}

/**
 * Same fallback behavior as `getModelForTask`, but for structured-output
 * callers: binds the schema to each provider individually first, then
 * composes fallbacks across the already-bound runnables (rather than binding
 * the schema to the fallback composite, which would fail — see
 * `getModelListForTask`'s doc comment).
 */
export function getStructuredModelForTask<T extends z.ZodTypeAny>(
  task: TaskType,
  schema: T,
): Runnable<BaseLanguageModelInput, z.infer<T>> {
  const models = getModelListForTask(task);
  const [primary, ...fallbacks] = models.map((model) => model.withStructuredOutput(schema));
  if (!primary) throw new Error(`No providers configured for task "${task}"`);
  const structured = fallbacks.length > 0 ? primary.withFallbacks(fallbacks) : primary;
  return structured as unknown as Runnable<BaseLanguageModelInput, z.infer<T>>;
}
