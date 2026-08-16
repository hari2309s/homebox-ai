"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

import { Button } from "./form";
import { TapButton } from "./tap-button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Styled replacement for `window.confirm()` — same yes/no semantics (confirm
 * calls back and closes, cancel/Escape/backdrop-click all just cancel), but
 * matching the app's own visual language instead of the browser's native
 * dialog chrome.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />
          <motion.div
            key="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-card"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <h2 id="confirm-dialog-title" className="text-lg font-bold text-ink">
              {title}
            </h2>
            {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <TapButton
                type="button"
                onClick={onCancel}
                className="cursor-pointer rounded-md border border-border bg-white px-4 py-2.5 font-bold text-ink transition-colors duration-150 hover:bg-surface-soft"
              >
                {cancelLabel}
              </TapButton>
              <Button type="button" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
