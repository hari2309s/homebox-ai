import type { ReactNode } from "react";

interface CrudShellProps {
  form: ReactNode;
  children: ReactNode;
}

/**
 * On mobile, the form stays at the top and the whole page scrolls together —
 * unchanged from before. From `md:` up there's room to spare, so this docks
 * the form as a compact bar at the bottom (like the chat input) instead of a
 * full-width block sitting above the list.
 */
export function CrudShell({ form, children }: CrudShellProps) {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:h-full md:gap-0 md:p-0">
      <div className="md:order-2 md:shrink-0 md:border-t md:border-border md:bg-white md:p-4">
        <div className="md:mx-auto md:w-full md:max-w-2xl">{form}</div>
      </div>
      <div className="flex flex-col gap-6 md:order-1 md:flex-1 md:overflow-y-auto md:p-6">{children}</div>
    </div>
  );
}
