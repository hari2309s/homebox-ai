export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "INR"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];
export const DEFAULT_CURRENCY: CurrencyCode = "USD";

const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: "USD ($)",
  EUR: "EUR (€)",
  GBP: "GBP (£)",
  INR: "INR (₹)",
};

export function currencyLabel(code: CurrencyCode): string {
  return CURRENCY_LABELS[code];
}

export function isSupportedCurrency(value: string | null | undefined): value is CurrencyCode {
  return !!value && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/** Coerces anything (a stored value, an AI guess) to a currency we actually support, falling back to the default. */
export function normalizeCurrency(value: string | null | undefined): CurrencyCode {
  const upper = value?.trim().toUpperCase();
  return isSupportedCurrency(upper) ? upper : DEFAULT_CURRENCY;
}

/**
 * `Intl.NumberFormat` with `style: "currency"` picks the correct symbol,
 * placement, and decimal formatting for any ISO 4217 code on its own — no
 * need to hand-maintain symbols or locale-specific formatting rules here.
 */
export function formatCurrency(
  amount: string | number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (amount === null || amount === undefined || amount === "") return null;
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) return null;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: normalizeCurrency(currency) }).format(value);
}
