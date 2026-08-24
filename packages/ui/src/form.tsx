"use client";

import { motion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Spinner } from "./spinner";

// Exported for password-input.tsx, which needs this same field chrome but
// can't just render `<Input>` — it has to inject a show/hide button inside
// the field's own padding, not just append a sibling.
export const fieldClassName =
  "w-full rounded-md border border-border bg-card px-3.5 py-2.5 text-base font-normal text-body outline-none transition-shadow duration-150 focus:border-accent focus:ring-4 focus:ring-accent/20";

const selectFieldClassName =
  "w-full appearance-none rounded-md border border-border bg-card py-2.5 pl-3.5 pr-9 text-base font-normal text-body outline-none transition-shadow duration-150 focus:border-accent focus:ring-4 focus:ring-accent/20";

export function cx(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(fieldClassName, props.className)} />;
}

/**
 * Native `<select>`s keep their own OS chrome (arrows, focus ring) even with
 * a matching className — `appearance-none` strips that, so this also draws
 * its own chevron since the native one disappears along with the rest.
 */
export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <div className={cx("relative", className)}>
      <select {...props} className={selectFieldClassName} />
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      >
        <path d="m5 7.5 5 5 5-5" />
      </svg>
    </div>
  );
}

/**
 * `loading` swaps in a centered spinner without changing the button's width:
 * `children` stay mounted (so their rendered width still reserves the space)
 * but turn invisible, and the spinner overlays absolutely on top — instead of
 * the old swap-the-children approach, which shrank the button to fit
 * whatever the spinner's own width happened to be.
 */
export function Button({
  className,
  children,
  loading,
  disabled,
  ...props
}: Omit<ComponentProps<typeof motion.button>, "children"> & { children?: ReactNode; loading?: boolean }) {
  const isDisabled = disabled || loading;
  return (
    <motion.button
      whileHover={isDisabled ? undefined : { scale: 1.02 }}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      disabled={isDisabled}
      className={cx(
        "relative flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 font-bold text-white transition-colors duration-150 hover:bg-accent-hover disabled:cursor-default disabled:opacity-60",
        className,
      )}
      {...props}
    >
      <span className={cx("inline-flex items-center gap-2", loading ? "invisible" : undefined)}>{children}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size={16} />
        </span>
      )}
    </motion.button>
  );
}

/**
 * A `Button` that reads pending state from the enclosing `<form action={...}>`
 * via `useFormStatus` — must be rendered as a descendant of that form, not
 * the form element itself. Shows a spinner and disables automatically while
 * the server action is in flight, no local state needed at the call site.
 */
export function SubmitButton({ children, disabled, ...props }: ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled} loading={pending} {...props}>
      {children}
    </Button>
  );
}
