import type { ComponentProps } from "react";

interface SpinnerProps extends Omit<ComponentProps<"svg">, "className"> {
  size?: number;
  className?: string;
}

/** Uses currentColor, so it inherits whatever text color its parent sets (e.g. text-white on a coral button). */
export function Spinner({ size = 20, className, ...props }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Working"
      className={`animate-spin ${className ?? ""}`}
      {...props}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

