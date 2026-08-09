"use client";

import { motion } from "framer-motion";
import type { ComponentProps } from "react";

const fieldClassName =
  "rounded-md border border-border bg-white px-3.5 py-2.5 text-base font-normal text-body outline-none transition-shadow duration-150 focus:border-accent focus:ring-4 focus:ring-accent/20";

function cx(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cx(fieldClassName, props.className)} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cx(fieldClassName, props.className)} />;
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
