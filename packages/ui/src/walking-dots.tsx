const DOT_COLORS = ["#c5c9bf", "#3f6b45", "#b0643f", "#8a7a4f"];

interface WalkingDotsProps {
  /** Dot width/height in px. Defaults to 8. */
  size?: number;
  className?: string;
}

/**
 * Four coloured dots that hop in sequence — the universal Groundplan loading
 * indicator. Replaces every spinner and "Loading" message in the app.
 *
 * Uses pure CSS `@keyframes` (defined in globals.css) so it animates during
 * SSR streaming, before JS hydrates. No framer-motion dependency.
 *
 * @see J10 · Groundplan – Mobile details, §4 Pull-to-refresh & splash
 */
export function WalkingDots({ size = 8, className }: WalkingDotsProps) {
  return (
    <span
      className={`inline-flex items-center ${className ?? ""}`}
      style={{ gap: size / 2 }}
      role="status"
      aria-label="Working"
    >
      {DOT_COLORS.map((color, i) => (
        <span
          key={color}
          className="walking-dot"
          style={{
            width: size,
            height: size,
            borderRadius: 2,
            background: color,
            "--dot-delay": `${i * 0.14}s`,
            "--dot-jump": `${-size * 0.625}px`,
          } as React.CSSProperties}
        />
      ))}
    </span>
  );
}

/**
 * Full-page centred walking dots with an optional label underneath.
 * Replaces `PageLoader` (the old SVG spinner).
 */
export function PageLoader({ label }: { label?: string } = {}) {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3">
      <WalkingDots size={12} />
      {label && (
        <span className="font-mono text-[10px] tracking-wide text-muted">{label}</span>
      )}
    </div>
  );
}
