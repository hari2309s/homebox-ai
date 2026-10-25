"use client";

import { PASSWORD_REQUIREMENTS } from "./password-policy";

function getStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "" };
  const passed = PASSWORD_REQUIREMENTS.filter((r) => r.test(password)).length;
  if (passed <= 1) return { score: 1, label: "Weak", color: "#b0643f" };
  if (passed <= 2) return { score: 2, label: "Fair", color: "#d9a43a" };
  if (passed <= 3) return { score: 3, label: "Strong", color: "#3f6b45" };
  return { score: 4, label: "Very strong", color: "#3f6b45" };
}

export function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color } = getStrength(password);
  if (!password) return null;

  const hint =
    score < 4
      ? score <= 2
        ? "Add numbers and symbols"
        : "Add a symbol for “very strong”"
      : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-4 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-1 rounded-sm transition-colors"
            style={{ background: i <= score ? color : "#d9dbd2" }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs">
        <span className="font-semibold" style={{ color }}>
          {label}
        </span>
        {hint && <span className="text-muted">{hint}</span>}
      </div>
    </div>
  );
}
