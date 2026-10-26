"use client";

import { Spinner, StaggerItem, StaggerList, TapButton } from "@homebox-ai/ui";
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
  loadingSessionId: string | null;
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

export function timeAgo(iso: string) {
  const diffSeconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= secondsInUnit)
      return relativeTimeFormatter.format(-Math.round(diffSeconds / secondsInUnit), unit);
  }
  return relativeTimeFormatter.format(-diffSeconds, "second");
}

/** Compact "2H" / "3D" stamp for the desktop conversations rail. */
export function shortAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes}M`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}H`;
  if (minutes < 60 * 24 * 7) return `${Math.round(minutes / 1440)}D`;
  return `${Math.round(minutes / 10080)}W`;
}

export function HistorySheet({ open, sessions, activeSessionId, loadingSessionId, onClose, onSelect, onNewChat }: HistorySheetProps) {
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
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[70vh] w-full max-w-lg flex-col rounded-t-2xl bg-card md:max-w-2xl lg:max-w-4xl xl:max-w-6xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
              <h2 className="font-bold text-ink">Conversations</h2>
              <TapButton
                type="button"
                onClick={onNewChat}
                className="cursor-pointer border-none bg-transparent text-sm font-semibold text-accent"
              >
                New chat
              </TapButton>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {sessions.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted">No past conversations yet.</p>
              ) : (
                <StaggerList className="m-0 flex list-none flex-col gap-1 p-0">
                  {sessions.map((session) => (
                    <StaggerItem key={session.sessionId}>
                      <TapButton
                        type="button"
                        onClick={() => onSelect(session.sessionId)}
                        whileHover={{ scale: 1.015 }}
                        disabled={loadingSessionId !== null}
                        className={`flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-md border-none px-3 py-2.5 text-left transition-colors duration-150 ${
                          session.sessionId === activeSessionId
                            ? "bg-surface-soft"
                            : "bg-transparent hover:bg-surface-soft"
                        }`}
                      >
                        <span className="flex w-full items-center gap-1.5 text-sm text-ink">
                          {session.hasUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                          <span className="flex-1 truncate">{session.title}</span>
                          {loadingSessionId === session.sessionId && (
                            <Spinner size={12} className="shrink-0 text-muted" />
                          )}
                        </span>
                        <span className="text-xs text-muted">{timeAgo(session.lastMessageAt)}</span>
                      </TapButton>
                    </StaggerItem>
                  ))}
                </StaggerList>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
