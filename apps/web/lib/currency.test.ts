import { describe, expect, it } from "vitest";

import { formatCurrency, isSupportedCurrency, normalizeCurrency } from "./currency";

describe("isSupportedCurrency", () => {
  it("accepts the four supported codes", () => {
    expect(isSupportedCurrency("USD")).toBe(true);
    expect(isSupportedCurrency("EUR")).toBe(true);
    expect(isSupportedCurrency("GBP")).toBe(true);
    expect(isSupportedCurrency("INR")).toBe(true);
  });

  it("rejects anything else, including null/undefined/empty", () => {
    expect(isSupportedCurrency("JPY")).toBe(false);
    expect(isSupportedCurrency("")).toBe(false);
    expect(isSupportedCurrency(null)).toBe(false);
    expect(isSupportedCurrency(undefined)).toBe(false);
  });
});

describe("normalizeCurrency", () => {
  it("passes through a supported code", () => {
    expect(normalizeCurrency("INR")).toBe("INR");
  });

  it("uppercases a lowercase code", () => {
    expect(normalizeCurrency("eur")).toBe("EUR");
  });

  it("falls back to USD for an unsupported or missing value", () => {
    expect(normalizeCurrency("JPY")).toBe("USD");
    expect(normalizeCurrency(null)).toBe("USD");
    expect(normalizeCurrency(undefined)).toBe("USD");
    expect(normalizeCurrency("")).toBe("USD");
  });
});

describe("formatCurrency", () => {
  it("formats a decimal string with the right symbol", () => {
    expect(formatCurrency("129.99", "USD")).toBe("$129.99");
    expect(formatCurrency("50", "EUR")).toBe("€50.00");
    expect(formatCurrency("1000", "INR")).toBe("₹1,000.00");
    expect(formatCurrency("75.5", "GBP")).toBe("£75.50");
  });

  it("falls back to USD formatting for an unrecognized currency", () => {
    expect(formatCurrency("10", "XXX")).toBe("$10.00");
  });

  it("returns null for empty, non-numeric, or missing amounts", () => {
    expect(formatCurrency("", "USD")).toBeNull();
    expect(formatCurrency(null, "USD")).toBeNull();
    expect(formatCurrency(undefined, "USD")).toBeNull();
    expect(formatCurrency("not-a-number", "USD")).toBeNull();
  });
});
