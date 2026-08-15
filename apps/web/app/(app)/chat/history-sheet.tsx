"use client";

import { AnimatePresence, motion } from "framer-motion";

interface ChatSession {
  sessionId: string;
  title: string;
  lastMessageAt: string;
  hasUnread: boolean;
}

interface HistorySheetProps {
  open: boolean;
  sessions: ChatSession[];
  activeSessionId: string;
  onClose: () => void;
  onSelect: (sessionId: string) => void;
  onNewChat: () => void;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function timeAgo(iso: string) {
  const diffSeconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= secondsInUnit) return relativeTimeFormatter.format(-Math.round(diffSeconds / secondsInUnit), unit);
  }
  return relativeTimeFormatter.format(-diffSeconds, "second");
}

export function HistorySheet({ open, sessions, activeSessionId, onClose, onSelect, onNewChat }: HistorySheetProps) {
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
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[70vh] w-full max-w-lg flex-col rounded-t-2xl bg-white md:max-w-2xl lg:max-w-4xl xl:max-w-6xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
              <h2 className="font-bold text-ink">Conversations</h2>
              <button
                type="button"
                onClick={onNewChat}
                className="cursor-pointer border-none bg-transparent text-sm font-semibold text-accent"
              >
                New chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {sessions.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted">No past conversations yet.</p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                  {sessions.map((session) => (
                    <li key={session.sessionId}>
                      <button
                        type="button"
                        onClick={() => onSelect(session.sessionId)}
                        className={`flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-md border-none px-3 py-2.5 text-left transition-colors duration-150 ${
                          session.sessionId === activeSessionId ? "bg-surface-soft" : "bg-transparent hover:bg-surface-soft"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-sm text-ink">
                          {session.hasUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                          {session.title}
                        </span>
                        <span className="text-xs text-muted">{timeAgo(session.lastMessageAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
