import { describe, expect, it } from "vitest";

import { isPasswordValid, PASSWORD_MIN_LENGTH } from "./password-policy";

describe("isPasswordValid", () => {
  it("rejects a password shorter than the minimum length", () => {
    expect(isPasswordValid("Ab1!defg")).toBe(false);
  });

  it("rejects a password missing an uppercase letter", () => {
    expect(isPasswordValid("lowercase1234!")).toBe(false);
  });

  it("rejects a password missing a lowercase letter", () => {
    expect(isPasswordValid("UPPERCASE1234!")).toBe(false);
  });

  it("rejects a password missing a number", () => {
    expect(isPasswordValid("NoNumbersHere!")).toBe(false);
  });

  it("rejects a password missing a symbol", () => {
    expect(isPasswordValid("NoSymbolsHere1")).toBe(false);
  });

  it("accepts a password meeting every requirement", () => {
    expect(isPasswordValid("Sturdy1Password!")).toBe(true);
  });

  it(`accepts a password exactly ${PASSWORD_MIN_LENGTH} characters long`, () => {
    const password = "Aa1!" + "a".repeat(PASSWORD_MIN_LENGTH - 4);
    expect(password).toHaveLength(PASSWORD_MIN_LENGTH);
    expect(isPasswordValid(password)).toBe(true);
  });
});
