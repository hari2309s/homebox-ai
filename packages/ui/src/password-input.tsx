"use client";

import type { ComponentProps } from "react";
import { useState } from "react";

import { cx, fieldClassName } from "./form";
import { TapButton } from "./tap-button";

function EyeIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9.9 4.2A10.4 10.4 0 0 1 12 4c6.4 0 10 8 10 8a17.7 17.7 0 0 1-3.3 4.4M6.5 6.6C3.4 8.6 2 12 2 12s3.6 8 10 8a9.7 9.7 0 0 0 4.4-1.1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

/** A password field with a show/hide toggle — same look as `Input`, just with a type that flips between "password" and "text". */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        {...props}
        className={cx(fieldClassName, "w-full pr-10", className)}
      />
      <TapButton
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        whileHover={{ scale: 1.1 }}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent p-0.5 text-muted transition-colors duration-150 hover:text-ink"
      >
        {visible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
      </TapButton>
    </div>
  );
}
