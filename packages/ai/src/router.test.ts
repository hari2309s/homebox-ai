import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "GOOGLE_API_KEY",
  "GOOGLE_MODEL",
  "GROQ_API_KEY",
  "CEREBRAS_API_KEY",
  "CEREBRAS_MODEL",
  "OPENROUTER_API_KEY",
  "OPENROUTER_VISION_MODEL",
  "OPENROUTER_MODEL",
];

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

// router.ts reads OPENROUTER_VISION_MODEL/OPENROUTER_MODEL once at module
// load (not per-call) to decide OpenRouter's per-task default model, so each
// test that cares about those needs a fresh module instance loaded after
// setting env vars — plain re-import would reuse the cached module.
async function freshRouter() {
  vi.resetModules();
  return import("./router");
}

describe("getModelListForTask", () => {
  it("returns nothing when no providers are configured", async () => {
    const { getModelListForTask } = await freshRouter();
    expect(getModelListForTask("chat_tools")).toEqual([]);
  });

  it("skips a missing key without breaking providers later in the chain", async () => {
    // GROQ_API_KEY intentionally left unset — first in chat_tools' chain.
    process.env.CEREBRAS_API_KEY = "test-key";
    process.env.OPENROUTER_API_KEY = "test-key";
    const { getModelListForTask } = await freshRouter();
    const models = getModelListForTask("chat_tools");
    expect(models.map((m) => m.constructor.name)).toEqual(["ChatOpenAI", "ChatOpenAI"]);
  });

  it("orders chat_tools as Groq, then Cerebras, then OpenRouter", async () => {
    process.env.GROQ_API_KEY = "test-key";
    process.env.CEREBRAS_API_KEY = "test-key";
    process.env.OPENROUTER_API_KEY = "test-key";
    const { getModelListForTask } = await freshRouter();
    const models = getModelListForTask("chat_tools");
    expect(models.map((m) => m.constructor.name)).toEqual(["ChatGroq", "ChatOpenAI", "ChatOpenAI"]);
    expect((models[1] as unknown as { model: string }).model).toBe("gpt-oss-120b"); // Cerebras
    expect((models[2] as unknown as { model: string }).model).toBe("google/gemma-4-31b-it:free"); // OpenRouter default
  });

  it("orders reasoning as Cerebras, then Groq, then OpenRouter", async () => {
    process.env.GROQ_API_KEY = "test-key";
    process.env.CEREBRAS_API_KEY = "test-key";
    process.env.OPENROUTER_API_KEY = "test-key";
    const { getModelListForTask } = await freshRouter();
    const models = getModelListForTask("reasoning");
    expect(models.map((m) => m.constructor.name)).toEqual(["ChatOpenAI", "ChatGroq", "ChatOpenAI"]);
  });

  it("orders vision as Gemini, then OpenRouter, using the vision-specific model", async () => {
    process.env.GOOGLE_API_KEY = "test-key";
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_VISION_MODEL = "some/vision-model:free";
    const { getModelListForTask } = await freshRouter();
    const models = getModelListForTask("vision");
    expect(models.map((m) => m.constructor.name)).toEqual(["ChatGoogleGenerativeAI", "ChatOpenAI"]);
    expect((models[1] as unknown as { model: string }).model).toBe("some/vision-model:free");
  });

  it("uses OPENROUTER_MODEL, not OPENROUTER_VISION_MODEL, as OpenRouter's fallback for text tasks", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_VISION_MODEL = "some/vision-model:free";
    process.env.OPENROUTER_MODEL = "some/text-model:free";
    const { getModelListForTask } = await freshRouter();
    const chatModel = getModelListForTask("chat_tools")[0] as unknown as { model: string };
    const visionModel = getModelListForTask("vision")[0] as unknown as { model: string };
    expect(chatModel.model).toBe("some/text-model:free");
    expect(visionModel.model).toBe("some/vision-model:free");
  });

  it("falls back to OPENROUTER_VISION_MODEL for text tasks when OPENROUTER_MODEL isn't set", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_VISION_MODEL = "some/vision-model:free";
    const { getModelListForTask } = await freshRouter();
    const chatModel = getModelListForTask("chat_tools")[0] as unknown as { model: string };
    expect(chatModel.model).toBe("some/vision-model:free");
  });
});

describe("getModelForTask", () => {
  it("throws when no providers are configured for the task", async () => {
    const { getModelForTask } = await freshRouter();
    expect(() => getModelForTask("reasoning")).toThrow('No providers configured for task "reasoning"');
  });

  it("returns a single model directly (no fallback wrapper) when only one provider is configured", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const { getModelForTask } = await freshRouter();
    expect(() => getModelForTask("chat_tools")).not.toThrow();
    expect(getModelForTask("chat_tools").constructor.name).toBe("ChatGroq");
  });
});

describe("getStructuredModelForTask", () => {
  it("throws when no providers are configured for the task", async () => {
    const { getStructuredModelForTask } = await freshRouter();
    const { z } = await import("zod");
    expect(() => getStructuredModelForTask("vision", z.object({}))).toThrow(
      'No providers configured for task "vision"',
    );
  });
});
