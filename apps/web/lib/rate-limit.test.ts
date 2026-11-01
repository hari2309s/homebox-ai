import { describe, expect, it } from "vitest";

import { checkRateLimit, type RateLimitConfig } from "./rate-limit";

const config: RateLimitConfig = { maxRequests: 3, windowMs: 1_000 };

describe("checkRateLimit", () => {
  it("allows requests up to the limit", () => {
    // Use a unique key per test to avoid cross-test interference.
    const key = "user-allow";
    expect(checkRateLimit(key, config).allowed).toBe(true); // 1
    expect(checkRateLimit(key, config).allowed).toBe(true); // 2
    const third = checkRateLimit(key, config);
    expect(third.allowed).toBe(true); // 3
    expect(third.remaining).toBe(0);
  });

  it("denies the request exceeding the limit", () => {
    const key = "user-deny";
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    const denied = checkRateLimit(key, config);
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.retryAfterMs).toBeGreaterThan(Date.now());
  });

  it("does not record denied attempts (they don't extend the window)", () => {
    const key = "user-no-record";
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    // Denied — should not count.
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    // Still denied at 3, not at 5.
    expect(checkRateLimit(key, config).allowed).toBe(false);
  });

  it("allows requests again after the window expires", async () => {
    const shortConfig: RateLimitConfig = { maxRequests: 2, windowMs: 50 };
    const key = "user-expire";
    checkRateLimit(key, shortConfig);
    checkRateLimit(key, shortConfig);
    expect(checkRateLimit(key, shortConfig).allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(checkRateLimit(key, shortConfig).allowed).toBe(true);
  });

  it("tracks separate keys independently", () => {
    const keyA = "user-a-independent";
    const keyB = "user-b-independent";
    checkRateLimit(keyA, config);
    checkRateLimit(keyA, config);
    checkRateLimit(keyA, config);
    expect(checkRateLimit(keyA, config).allowed).toBe(false);
    // keyB is unaffected.
    expect(checkRateLimit(keyB, config).allowed).toBe(true);
  });

  it("reports correct remaining count", () => {
    const key = "user-remaining";
    expect(checkRateLimit(key, config).remaining).toBe(2);
    expect(checkRateLimit(key, config).remaining).toBe(1);
    expect(checkRateLimit(key, config).remaining).toBe(0);
  });
});
