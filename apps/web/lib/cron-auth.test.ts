import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isCronRequestAuthorized } from "./cron-auth";

let savedCronSecret: string | undefined;

beforeEach(() => {
  savedCronSecret = process.env.CRON_SECRET;
});

afterEach(() => {
  if (savedCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = savedCronSecret;
});

function requestWithAuth(header: string | null) {
  const headers = new Headers();
  if (header !== null) headers.set("authorization", header);
  return new Request("https://example.com/api/notifiers/reminder-check", { headers });
}

describe("isCronRequestAuthorized", () => {
  it("accepts the exact configured secret", () => {
    process.env.CRON_SECRET = "test-secret";
    expect(isCronRequestAuthorized(requestWithAuth("Bearer test-secret"))).toBe(true);
  });

  it("rejects a wrong secret", () => {
    process.env.CRON_SECRET = "test-secret";
    expect(isCronRequestAuthorized(requestWithAuth("Bearer wrong-secret"))).toBe(false);
  });

  it("rejects a missing Authorization header", () => {
    process.env.CRON_SECRET = "test-secret";
    expect(isCronRequestAuthorized(requestWithAuth(null))).toBe(false);
  });

  it("rejects when CRON_SECRET isn't configured, even with a header present", () => {
    delete process.env.CRON_SECRET;
    expect(isCronRequestAuthorized(requestWithAuth("Bearer anything"))).toBe(false);
  });

  it("rejects a same-prefix header of a different length rather than crashing on the length check", () => {
    process.env.CRON_SECRET = "test-secret";
    expect(isCronRequestAuthorized(requestWithAuth("Bearer test-secret-but-longer"))).toBe(false);
  });

  it("is case-sensitive about the secret", () => {
    process.env.CRON_SECRET = "test-secret";
    expect(isCronRequestAuthorized(requestWithAuth("Bearer TEST-SECRET"))).toBe(false);
  });
});
