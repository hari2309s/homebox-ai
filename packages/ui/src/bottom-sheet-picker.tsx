"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

const SEARCH_THRESHOLD = 8;

export interface PickerOption {
  value: string;
  label: string;
  /** Optional secondary text shown below the label. */
  sub?: string;
}

interface BottomSheetPickerProps {
  open: boolean;
  title: string;
  options: PickerOption[];
  value?: string | null;
  searchPlaceholder?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  /** Renders a custom row. If omitted, uses the default label + sub layout. */
  renderOption?: (option: PickerOption, selected: boolean) => ReactNode;
}

/**
 * J10 bottom-sheet picker — replaces native `<select>` on mobile.
 * 22px top radius, grab handle, optional search (8+ options), radio rows.
 */
export function BottomSheetPicker({
  open,
  title,
  options,
  value,
  searchPlaceholder,
  onSelect,
  onClose,
  renderOption,
}: BottomSheetPickerProps) {
  const [query, setQuery] = useState("");
  const showSearch = options.length >= SEARCH_THRESHOLD;

  // Reset search when sheet opens/closes.
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.sub?.toLowerCase().includes(q),
    );
  }, [options, query]);

  const handleSelect = useCallback(
    (val: string) => {
      onSelect(val);
      onClose();
    },
    [onSelect, onClose],
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-[rgba(31,38,34,.38)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-[22px] bg-surface"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            {/* Grab handle */}
            <div className="flex justify-center pb-2 pt-2">
              <span className="h-1 w-10 rounded-[2px] bg-[#c5c9bf]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3">
              <span className="font-serif text-[22px] text-ink">{title}</span>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-muted"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            {/* Search */}
            {showSearch && (
              <div className="px-4 pb-3">
                <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-3">
                  <span className="material-symbols-rounded text-[20px] text-muted">search</span>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder ?? `Search ${options.length} options…`}
                    className="min-w-0 flex-1 border-none bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
                  />
                </div>
              </div>
            )}

            {/* Options list */}
            <div className="flex-1 overflow-y-auto px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
              <div className="rounded-[14px] border border-border bg-card px-3">
                {filtered.length === 0 ? (
                  <div className="flex min-h-[52px] items-center justify-center text-[14px] text-muted">
                    No matches
                  </div>
                ) : (
                  filtered.map((option, i) => {
                    const selected = option.value === value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelect(option.value)}
                        className={`flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-0 py-0 text-left ${
                          i < filtered.length - 1 ? "border-b border-b-[#eeeee8]" : ""
                        } ${selected ? "bg-[#f6f9f3]" : ""}`}
                        style={{
                          minHeight: 52,
                          borderBottomWidth: i < filtered.length - 1 ? 1 : 0,
                          borderBottomColor: "#eeeee8",
                          borderBottomStyle: "solid",
                        }}
                      >
                        {/* Radio circle */}
                        <span
                          className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full"
                          style={{
                            border: selected ? "6px solid #3f6b45" : "1.5px solid #b9bfb3",
                            boxSizing: "border-box",
                          }}
                        />
                        {renderOption ? (
                          renderOption(option, selected)
                        ) : (
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block text-[15px] text-ink ${selected ? "font-semibold" : ""}`}
                            >
                              {option.label}
                            </span>
                            {option.sub && (
                              <span className="block truncate text-[12px] text-muted">{option.sub}</span>
                            )}
                          </span>
                        )}
                        {selected && (
                          <span className="material-symbols-rounded text-[20px] text-accent">check</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
