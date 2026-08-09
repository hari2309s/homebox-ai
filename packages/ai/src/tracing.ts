import { CallbackHandler } from "@langfuse/langchain";

export interface TracingContext {
  /** Supabase auth user id — enables per-user filtering/cost attribution in Langfuse. */
  userId?: string;
  /** Groups multi-turn interactions in Langfuse's Sessions view. */
  sessionId?: string;
  /** e.g. "chat", "photo-to-item" — enables per-feature analytics/dashboards. */
  tags?: string[];
}

/**
 * Builds a Langfuse callback handler for a single graph invocation. Pass the
 * result as `{ callbacks: [handler] }` in the invoke config — callbacks are
 * request-scoped (userId/sessionId), so this is constructed per-call at the
 * route handler, not baked into the graphs themselves.
 */
export function createLangfuseHandler(context: TracingContext = {}) {
  return new CallbackHandler({
    userId: context.userId,
    sessionId: context.sessionId,
    tags: context.tags,
  });
}
