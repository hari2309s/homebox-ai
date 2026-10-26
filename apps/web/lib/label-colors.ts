/** The 12 J3 label tints, each paired with an ink that passes 4.5:1 on it. */
export const LABEL_SWATCHES = [
  { bg: "#dfe8d6", ink: "#2c4d31" },
  { bg: "#d6eaea", ink: "#1f4a4a" },
  { bg: "#f6e7c4", ink: "#6b4e10" },
  { bg: "#f6dde5", ink: "#7a2f47" },
  { bg: "#dde6f0", ink: "#2c4767" },
  { bg: "#ebe0d4", ink: "#4a3524" },
  { bg: "#e7e1d0", ink: "#5a4f33" },
  { bg: "#e2e2dc", ink: "#1f2622" },
  { bg: "#ecdccd", ink: "#7a3f22" },
  { bg: "#e6dff0", ink: "#4a3a6b" },
  { bg: "#dcebe0", ink: "#24503a" },
  { bg: "#f3e3d3", ink: "#6b3f1f" },
] as const;

const HEX = /^#[0-9a-f]{6}$/i;

/** Background + text colour for a label chip. Swatch colours use their paired ink; older free-picked colours fall back to a luminance check. */
export function labelChip(color: string | null): { bg: string; ink: string } {
  if (!color || !HEX.test(color)) return { bg: "var(--color-surface-soft)", ink: "var(--color-ink)" };
  const swatch = LABEL_SWATCHES.find((s) => s.bg.toLowerCase() === color.toLowerCase());
  if (swatch) return swatch;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return { bg: color, ink: (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#1f2622" : "#ffffff" };
}
