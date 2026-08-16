"use client";

import { PASSWORD_REQUIREMENTS } from "./password-policy";

/** Live checklist shown under a new-password field — signup, change-password, and reset-password all share this. */
export function PasswordRequirementsList({ password }: { password: string }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-xs">
      {PASSWORD_REQUIREMENTS.map((requirement) => {
        const met = requirement.test(password);
        return (
          <li key={requirement.id} className={`flex items-center gap-1.5 ${met ? "text-body" : "text-muted"}`}>
            <span aria-hidden="true">{met ? "✓" : "○"}</span>
            {requirement.label}
          </li>
        );
      })}
    </ul>
  );
}
