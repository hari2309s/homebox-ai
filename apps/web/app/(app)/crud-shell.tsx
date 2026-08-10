import type { ReactNode } from "react";

interface CrudShellProps {
  form: ReactNode;
  children: ReactNode;
}

/**
 * The form docks as a compact bar above the bottom nav on every screen size
 * (matching chat's input bar) — full-width on mobile, narrower and centered
 * from `md:` up — while the list fills the remaining scrollable space above it.
 */
export function CrudShell({ form, children }: CrudShellProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="order-2 shrink-0 border-t border-border bg-white p-4 md:p-6">
        <div className="md:mx-auto md:w-full md:max-w-2xl">{form}</div>
      </div>
      <div className="order-1 flex flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">{children}</div>
    </div>
  );
}
