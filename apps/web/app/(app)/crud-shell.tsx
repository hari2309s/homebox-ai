"use client";

import { TapButton } from "@homebox-ai/ui";
import { useState } from "react";
import type { ReactNode } from "react";

interface CrudShellProps {
  formAction: (formData: FormData) => Promise<void>;
  formFields: ReactNode;
  formClassName?: string;
  toggleLabel: string;
  children: ReactNode;
}

export function CrudShell({ formAction, formFields, formClassName, toggleLabel, children }: CrudShellProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      await formAction(formData);
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div data-scroll-container className="flex h-full flex-col overflow-y-auto p-4">
      <div className="flex flex-1 flex-col gap-4">{children}</div>

      <div className="sticky bottom-0 -mx-4 -mb-4 mt-4 border-t border-border/70 bg-surface/80 p-4 backdrop-blur-lg">
        {formOpen ? (
          <div className="flex flex-col gap-2">
            <form action={handleSubmit} className={formClassName ?? "flex flex-col gap-3"}>
              {formFields}
            </form>
            {error && (
              <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
                {error}
              </p>
            )}
            <TapButton
              type="button"
              onClick={() => setFormOpen(false)}
              className="cursor-pointer self-start border-none bg-transparent text-sm font-semibold text-accent"
            >
              Cancel
            </TapButton>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-sm font-semibold text-muted transition-colors duration-150 hover:border-accent hover:text-accent"
          >
            <span className="material-symbols-rounded text-base">add</span>
            {toggleLabel}
          </button>
        )}
      </div>
    </div>
  );
}
