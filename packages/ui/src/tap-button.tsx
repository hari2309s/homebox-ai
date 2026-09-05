"use client";

import { motion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";

import { cx } from "./form";
import { Spinner } from "./spinner";

/**
 * A bare `motion.button` with just hover/tap feedback baked in — no visual
 * styling of its own, unlike `Button`. For the many small text/icon buttons
 * (Edit, Delete, Cancel, nav icons, …) that each need their own colors and
 * sizing but should still feel interactive like everything else in the app.
 *
 * `loading` swaps in a centered spinner without changing the button's width —
 * same technique as `Button`'s `loading` prop: `children` stay mounted but
 * turn invisible, and the spinner overlays absolutely on top, instead of
 * swapping children for a spinner outright and letting the button shrink to
 * fit it.
 */
export function TapButton({
  whileHover,
  whileTap,
  transition,
  className,
  children,
  loading,
  disabled,
  ...props
}: Omit<ComponentProps<typeof motion.button>, "children"> & { children?: ReactNode; loading?: boolean }) {
  const isDisabled = disabled || loading;
  const motionProps = {
    whileHover: whileHover ?? (isDisabled ? undefined : { scale: 1.06 }),
    whileTap: whileTap ?? (isDisabled ? undefined : { scale: 0.94 }),
    transition: transition ?? { type: "spring" as const, stiffness: 400, damping: 17 },
    disabled: isDisabled,
    ...props,
  };

  // `loading` is opt-in: most call sites never pass it, and should render
  // exactly as before (children as-is, no extra wrapper) rather than every
  // existing TapButton picking up a new inline-flex wrapper span by default.
  if (loading === undefined) {
    return (
      <motion.button className={className} {...motionProps}>
        {children}
      </motion.button>
    );
  }

  return (
    <motion.button className={cx("relative", className)} {...motionProps}>
      <span className={cx("inline-flex items-center gap-1.5", loading ? "invisible" : undefined)}>{children}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size={12} />
        </span>
      )}
    </motion.button>
  );
}
