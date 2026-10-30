"use client";

import { TapButton, WalkingDots } from "@homebox-ai/ui";
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

const RAIL_DOTS = ["#3f6b45", "#b0643f", "#8a7a4f", "#3f8a8a", "#5b7fa6"];

function groupByTime(sessions: ChatSession[]) {
  const now = Date.now();
  const dayMs = 86400000;
  const today: ChatSession[] = [];
  const thisWeek: ChatSession[] = [];
  const older: ChatSession[] = [];

  for (const s of sessions) {
    const age = now - new Date(s.lastMessageAt).getTime();
    if (age < dayMs) today.push(s);
    else if (age < dayMs * 7) thisWeek.push(s);
    else older.push(s);
  }

  const groups: { label: string; items: ChatSession[] }[] = [];
  if (today.length) groups.push({ label: "TODAY", items: today });
  if (thisWeek.length) groups.push({ label: "THIS WEEK", items: thisWeek });
  if (older.length) groups.push({ label: "OLDER", items: older });
  return groups;
}

export function HistorySheet({ open, sessions, activeSessionId, loadingSessionId, onClose, onSelect, onNewChat }: HistorySheetProps) {
  const groups = groupByTime(sessions);
  let dotIndex = 0;

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
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl bg-surface md:max-w-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            {/* Grab handle */}
            <div className="flex justify-center pt-[10px]">
              <span className="h-1 w-10 rounded-full bg-faint" />
            </div>

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-[14px]">
              <h2 className="m-0 font-serif text-[24px] font-normal text-ink">Conversations</h2>
              <TapButton
                type="button"
                onClick={onNewChat}
                className="flex cursor-pointer items-center gap-1 rounded-[10px] border-none bg-accent px-3 py-2 text-[13px] font-semibold text-on-accent"
              >
                <span className="material-symbols-rounded text-[18px]">edit_square</span>
                New
              </TapButton>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-8">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-[14px] py-16 text-center">
                  <div className="flex h-[84px] w-[84px] items-center justify-center rounded-[20px] border-2 border-dashed border-faint">
                    <span className="material-symbols-rounded text-[36px] text-accent">forum</span>
                  </div>
                  <div className="font-serif text-[22px] text-ink">No past conversations yet</div>
                  <div className="max-w-[260px] text-[14px] leading-relaxed text-muted">
                    Everything you ask is kept here, so you can come back to &ldquo;where did we put the pump?&rdquo;
                  </div>
                  <button
                    type="button"
                    onClick={onNewChat}
                    className="mt-2 w-full cursor-pointer rounded-xl border-none bg-accent px-4 py-[14px] text-[15px] font-semibold text-on-accent"
                  >
                    Start a conversation
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-[14px]">
                  {groups.map((group) => (
                    <div key={group.label} className="flex flex-col gap-[6px]">
                      <div className="px-1 font-mono text-[10px] text-muted">{group.label}</div>
                      <div className="overflow-hidden rounded-[14px] border border-border bg-card">
                        {group.items.map((session, i) => {
                          const active = session.sessionId === activeSessionId;
                          const dot = RAIL_DOTS[dotIndex++ % RAIL_DOTS.length];
                          return (
                            <button
                              key={session.sessionId}
                              type="button"
                              onClick={() => onSelect(session.sessionId)}
                              disabled={loadingSessionId !== null}
                              className={`flex w-full cursor-pointer items-center gap-[10px] border-none px-3 py-[11px] text-left ${
                                i > 0 ? "border-t border-border" : ""
                              } ${active ? "bg-selected-soft" : "bg-transparent"}`}
                            >
                              <span
                                className="h-2 w-2 flex-none rounded-[2px]"
                                style={{ background: dot }}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[14px] font-semibold text-ink">
                                  {session.title}
                                </span>
                                <span className="block truncate text-[12px] text-muted">
                                  {session.hasUnread ? "New reply from the house" : timeAgo(session.lastMessageAt)}
                                </span>
                              </span>
                              {loadingSessionId === session.sessionId ? (
                                <WalkingDots size={5} className="flex-none" />
                              ) : (
                                <span className="flex-none font-mono text-[10px] text-muted">
                                  {shortAgo(session.lastMessageAt)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
