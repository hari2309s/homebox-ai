import type { ReactNode } from "react";

interface FormFieldProps {
  label: ReactNode;
  /** Set when this field sits inside a `sm:flex-row` group of fields sharing the row equally. */
  flex?: boolean;
  children: ReactNode;
}

/** The label+input wrapper repeated across nearly every form in the app — one place for that shared markup instead of retyping the same five classes at each call site. */
export function FormField({ label, flex = false, children }: FormFieldProps) {
  return (
    <label className={`flex ${flex ? "min-w-0 flex-1 " : ""}flex-col gap-1.5 text-sm font-semibold text-ink`}>
      {label}
      {children}
    </label>
  );
}
