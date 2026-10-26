"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export const FIELD =
  "w-full rounded-[10px] border border-border bg-card px-3 py-[9px] text-[14px] text-ink outline-none focus:border-2 focus:border-accent focus:px-[11px] focus:py-2 focus:shadow-[0_0_0_3px_var(--color-selected)]";

export const BAR_BUTTON =
  "flex h-[34px] cursor-pointer items-center gap-[6px] rounded-[9px] border border-border bg-card px-3 text-[13px] font-semibold text-ink";
export const BAR_PRIMARY =
  "flex h-[34px] cursor-pointer items-center gap-[6px] rounded-[9px] border-none bg-accent px-[14px] text-[13px] font-semibold text-white disabled:opacity-60";

export function StepPills({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="m-0 flex list-none gap-2 p-0" aria-label="Steps">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={`flex h-[34px] items-center gap-[6px] rounded-full px-3 text-[13px] font-semibold ${
              active
                ? "bg-ink text-surface"
                : done
                  ? "bg-selected text-(--plan-ink)"
                  : "border border-border text-muted"
            }`}
          >
            <span aria-hidden className="material-symbols-rounded text-[16px]">
              {done ? "check" : active ? "edit" : "radio_button_unchecked"}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

export function HoppingSquares({ label }: { label?: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-1">
        {["#3f6b45", "#b0643f", "#8a7a4f"].map((c, i) => (
          <span
            key={c}
            className="h-[10px] w-[10px] animate-bounce rounded-[2px]"
            style={{ background: c, animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      {label && <span className="text-[14px] text-body">{label}</span>}
    </span>
  );
}

/** Large drop target for step 1 — click to browse, drag a file in, or paste an image from the clipboard. */
export function DropZone({
  title,
  hint,
  accept = "image/*",
  onFile,
}: {
  title: string;
  hint: string;
  accept?: string;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const file = [...(event.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) {
        event.preventDefault();
        onFile(file);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFile]);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const file = [...event.dataTransfer.files].find((f) => f.type.startsWith("image/"));
        if (file) onFile(file);
      }}
      className={`flex min-h-[420px] flex-1 flex-col items-center justify-center gap-4 rounded-[18px] border-2 border-dashed p-8 text-center transition-colors ${
        over ? "border-accent bg-selected-soft" : "border-[#b9bfb3] bg-rail dark:border-border"
      }`}
    >
      <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-2xl bg-selected text-accent">
        <span className="material-symbols-rounded text-[32px] leading-none">add_a_photo</span>
      </span>
      <div className="font-serif text-[24px] text-ink">{title}</div>
      <p className="m-0 max-w-md text-[14px] leading-normal text-muted">{hint}</p>
      <button type="button" onClick={() => inputRef.current?.click()} className={BAR_PRIMARY}>
        <span aria-hidden className="material-symbols-rounded text-[16px]">
          upload
        </span>
        Choose a photo
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}

export function FieldLabel({
  label,
  ai,
  children,
  span,
}: {
  label: string;
  ai?: boolean;
  children: ReactNode;
  span?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 ${span ? "col-span-2" : ""}`}>
      <span className="flex justify-between">
        <span className="text-[12px] font-semibold text-body">{label}</span>
        {ai && (
          <span
            className="flex items-center gap-[2px] font-mono text-[10px] text-accent"
            title="Filled in from the photo"
          >
            <span aria-hidden className="material-symbols-rounded text-[13px]">
              auto_awesome
            </span>
            AI
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
