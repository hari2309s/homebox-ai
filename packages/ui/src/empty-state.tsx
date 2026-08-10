import type { ReactNode } from "react";

/**
 * Centers its message within whatever space is available. Relies on a
 * `flex flex-col` ancestor to actually have room to grow into (as CrudShell's
 * list pane does on `md:`+); on mobile, where that pane's height is just its
 * natural content height, the padding still keeps it from looking cramped.
 */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center md:py-0">
      <p className="text-sm text-muted">{children}</p>
    </div>
  );
}
