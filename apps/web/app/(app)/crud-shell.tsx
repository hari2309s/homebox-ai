"use client";

import { TapButton } from "@homebox-ai/ui";
import { useState } from "react";
import type { ReactNode } from "react";

interface CrudShellProps {
  /** Server action to submit the docked form to. */
  formAction: (formData: FormData) => Promise<void>;
  /** The form's fields (inputs, selects, submit button, …) — CrudShell renders the `<form>` itself so it can catch errors and auto-collapse on success. */
  formFields: ReactNode;
  formClassName?: string;
  /** Label for the collapsed toggle bar, e.g. "Add item". */
  toggleLabel: string;
  children: ReactNode;
}

/**
 * The form docks as a translucent, blurred bar pinned to the bottom of the
 * same scroll container as the list — `sticky` (not `fixed`), and the last
 * child in DOM order, so it only floats over list rows while there's more
 * of them above it; once scrolled to the very end it just settles in place,
 * with nothing left hidden behind it. Collapsed by default behind a slim
 * toggle; expands inline on demand.
 *
 * Owning the `<form>` (rather than taking a pre-built one) lets this catch
 * the action's errors and only collapse back on success — a form that just
 * threw stays open with its input intact instead of silently resetting.
 */
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
    <div className="flex h-full flex-col overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-1 flex-col gap-6 md:mx-auto md:w-full md:max-w-2xl">{children}</div>

      <div className="sticky bottom-0 -mx-4 -mb-4 mt-4 border-t border-border/70 bg-surface-soft/70 p-4 shadow-card backdrop-blur-lg sm:-mx-6 sm:-mb-6 sm:p-6 md:mx-auto md:mb-0 md:w-full md:max-w-2xl">
        {formOpen ? (
          <div className="flex flex-col gap-2">
            <form action={handleSubmit} className={formClassName ?? "flex flex-col gap-3"}>
              {formFields}
            </form>
            {error && (
              <p role="alert" className="text-sm text-accent-hover">
                {error}
              </p>
            )}
            <TapButton
              type="button"
              onClick={() => setFormOpen(false)}
              className="cursor-pointer self-start border-none bg-transparent text-sm font-semibold text-ink"
            >
              Cancel
            </TapButton>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-sm font-semibold text-muted transition-colors duration-150 hover:border-accent hover:text-accent-hover"
          >
            + {toggleLabel}
          </button>
        )}
      </div>
    </div>
  );
}
