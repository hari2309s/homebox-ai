"use client";

import { motion } from "framer-motion";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Spinner } from "./spinner";

const fieldClassName =
  "rounded-md border border-border bg-white px-3.5 py-2.5 text-base font-normal text-body outline-none transition-shadow duration-150 focus:border-accent focus:ring-4 focus:ring-accent/20";

const selectFieldClassName =
  "w-full appearance-none rounded-md border border-border bg-white py-2.5 pl-3.5 pr-9 text-base font-normal text-body outline-none transition-shadow duration-150 focus:border-accent focus:ring-4 focus:ring-accent/20";

function cx(...classes: Array<string | undefined>) {
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

export function Button({ className, ...props }: ComponentProps<typeof motion.button>) {
  return (
    <motion.button
      whileHover={props.disabled ? undefined : { scale: 1.02 }}
      whileTap={props.disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cx(
        "cursor-pointer rounded-md bg-accent px-4 py-2.5 font-bold text-white transition-colors duration-150 hover:bg-accent-hover disabled:cursor-default disabled:opacity-60",
        className,
      )}
      {...props}
    />
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
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending ? <Spinner size={16} /> : children}
    </Button>
  );
}
