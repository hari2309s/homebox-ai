"use client";

interface InlineErrorCardProps {
  /** Material Symbols icon name, e.g. "cloud_off" or "error". */
  icon?: string;
  /** Bold title line, e.g. "Couldn't read that photo". */
  title: string;
  /** Supporting description below the title. */
  description?: string;
  /** Label for the retry button. Defaults to "Try again". Pass `null` to hide the button. */
  retryLabel?: string | null;
  /** Called when the retry button is tapped. If omitted the button is hidden. */
  onRetry?: () => void;
}

/**
 * Clay-themed inline error card matching Design J's danger tokens.
 * Used across all AI features (capture, receipt, room-scan, maintenance)
 * to replace the old plain `<p role="alert">` error display.
 */
export function InlineErrorCard({ icon = "error", title, description, retryLabel = "Try again", onRetry }: InlineErrorCardProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-[10px] rounded-[14px] border-[1.5px] border-danger-line bg-danger-faint p-3"
    >
      <div className="flex items-start gap-[10px]">
        <span className="material-symbols-rounded text-clay">{icon}</span>
        <div className="flex-1 text-[14px] leading-relaxed text-danger-ink">
          <strong>{title}</strong>
          {description && <> {description}</>}
        </div>
      </div>
      {onRetry && retryLabel && (
        <button
          type="button"
          onClick={onRetry}
          className="flex w-fit cursor-pointer items-center gap-1 rounded-lg bg-clay px-3 py-[7px] text-[13px] font-semibold text-on-accent"
        >
          <span className="material-symbols-rounded text-[16px]">refresh</span>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
