"use client";

import { TapButton } from "@homebox-ai/ui";
import { motion } from "framer-motion";
import Link from "next/link";
import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

import type { PendingAction } from "@homebox-ai/ai";

import { confirmChatActionAction, listChatSessionsAction, loadChatSessionAction } from "./actions";
import { ActionCard } from "./action-card";
import { HistorySheet, shortAgo, timeAgo } from "./history-sheet";
import { MessageContent } from "./message-content";

interface ReferencedItem {
  id: string;
  name: string;
  photoUrl: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pendingAction?: PendingAction;
  viewHref?: string;
  viewHrefLabel?: string;
  referencedItems?: ReferencedItem[];
  createdAt?: string;
}

interface ChatSession {
  sessionId: string;
  title: string;
  lastMessageAt: string;
  hasUnread: boolean;
}

const SUGGESTIONS = [
  { q: "What needs doing before the frost?", c: "#3f6b45" },
  { q: "Where's the long-handled fish net?", c: "#3f8a8a" },
  { q: "Which warranties end this year?", c: "#5b7fa6" },
  { q: "What's in the garage I never use?", c: "#b0643f" },
];
const RAIL_DOTS = ["#3f6b45", "#b0643f", "#8a7a4f", "#5b7fa6"];

function TypingDots() {
  const colors = ["#c5c9bf", "#3f6b45", "#b0643f", "#8a7a4f"];
  return (
    <div className="flex items-center gap-1">
      {colors.map((color, i) => (
        <motion.span
          key={color}
          className="h-2 w-2 rounded-[2px]"
          style={{ background: color }}
          animate={{ opacity: [0.45, 1, 0.45], y: [0, -5, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export function ChatClient({ itemCount, zoneCount, userName = "You" }: { itemCount: number; zoneCount: number; userName?: string }) {
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [resolvedActions, setResolvedActions] = useState<Record<string, "confirmed" | "cancelled">>({});
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(sessionId);
  const abortRef = useRef<AbortController | null>(null);

  function scrollToBottom() {
    scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: "smooth" });
  }

  useEffect(() => {
    listChatSessionsAction()
      .then(setSessions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);
  useEffect(() => {
    scrollToBottom();
  }, [messages, pending]);

  function startNewChat() {
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setError(null);
    setResolvedActions({});
    setHistoryOpen(false);
  }

  async function switchToSession(id: string) {
    if (id === sessionId) {
      setHistoryOpen(false);
      return;
    }
    setError(null);
    setMessages([]);
    setResolvedActions({});
    setSessionId(id);
    setLoadingSessionId(id);
    try {
      const history = await loadChatSessionAction(id);
      setMessages(history);
    } catch {
      setError("Couldn't load that conversation");
    } finally {
      setLoadingSessionId(null);
      setHistoryOpen(false);
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const requestSessionId = sessionId;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: trimmed, createdAt: new Date().toISOString() },
    ]);
    setInput("");
    setPending(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, sessionId: requestSessionId }),
        signal: controller.signal,
      });
      let data: { reply?: string; error?: string; pendingAction?: PendingAction; referencedItems?: ReferencedItem[] } =
        {};
      try {
        data = await response.json();
      } catch {
        /* non-JSON body */
      }
      if (!response.ok) throw new Error(data.error ?? "Something went wrong");
      if (!data.reply) throw new Error("Something went wrong");
      if (sessionIdRef.current === requestSessionId) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.reply!,
            pendingAction: data.pendingAction,
            referencedItems: data.referencedItems?.length ? data.referencedItems : undefined,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
      listChatSessionsAction()
        .then(setSessions)
        .catch(() => {});
    } catch (err) {
      if (controller.signal.aborted) return;
      if (sessionIdRef.current === requestSessionId) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setPending(false);
    }
  }

  function stopReply() {
    abortRef.current?.abort();
  }

  async function handleConfirmAction(messageId: string, action: PendingAction) {
    const requestSessionId = sessionIdRef.current;
    try {
      const result = await confirmChatActionAction(requestSessionId, action);
      if (sessionIdRef.current !== requestSessionId) return;
      setResolvedActions((prev) => ({ ...prev, [messageId]: "confirmed" }));
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.message,
          viewHref: result.href,
          viewHrefLabel: result.hrefLabel,
          createdAt: new Date().toISOString(),
        },
      ]);

      setPending(true);
      setError(null);
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Continue.", sessionId: requestSessionId, isContinuation: true }),
        });
        let data: {
          reply?: string;
          error?: string;
          pendingAction?: PendingAction;
          referencedItems?: ReferencedItem[];
        } = {};
        try {
          data = await response.json();
        } catch {
          /* non-JSON body */
        }
        if (response.ok && data.reply && sessionIdRef.current === requestSessionId) {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: data.reply!,
              pendingAction: data.pendingAction,
              referencedItems: data.referencedItems?.length ? data.referencedItems : undefined,
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      } catch {
        /* continuation errors are swallowed — primary action already succeeded */
      } finally {
        if (sessionIdRef.current === requestSessionId) setPending(false);
      }
    } catch (err) {
      if (sessionIdRef.current === requestSessionId) {
        setError(err instanceof Error ? err.message : "Couldn't complete that action");
      }
    }
  }

  function handleCancelAction(messageId: string) {
    setResolvedActions((prev) => ({ ...prev, [messageId]: "cancelled" }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) {
      stopReply();
      return;
    }
    sendMessage(input);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendMessage(input);
    }
  }

  const activeSession = sessions.find((s) => s.sessionId === sessionId);

  return (
    <div data-full-bleed className="flex h-full">
      {/* Desktop conversations rail */}
      <aside className="hidden w-[clamp(440px,34vw,560px)] flex-none flex-col gap-3 overflow-y-auto border-r border-border px-4 py-[22px] lg:flex">
        <div className="flex items-center justify-between">
          <h1 className="m-0 font-serif text-[22px] font-normal text-ink">Conversations</h1>
          <TapButton
            type="button"
            onClick={startNewChat}
            aria-label="New conversation"
            className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-[9px] border-none bg-accent text-on-accent"
          >
            <span className="material-symbols-rounded text-[18px]">edit_square</span>
          </TapButton>
        </div>
        {sessions.length === 0 ? (
          <p className="m-0 px-[10px] text-[13px] text-muted">No past conversations yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-[2px] p-0">
            {sessions.map((session, i) => {
              const active = session.sessionId === sessionId;
              return (
                <li key={session.sessionId}>
                  <button
                    type="button"
                    onClick={() => switchToSession(session.sessionId)}
                    disabled={loadingSessionId !== null}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full cursor-pointer gap-[10px] rounded-[10px] border-none p-[10px] text-left transition-colors duration-150 ${
                      active ? "bg-card shadow-[0_1px_2px_rgba(31,38,34,.06)]" : "bg-transparent hover:bg-surface-soft"
                    }`}
                  >
                    <span
                      className="mt-[5px] h-2 w-2 flex-none rounded-[2px]"
                      style={{ background: RAIL_DOTS[i % RAIL_DOTS.length] }}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-[13px] text-ink ${session.hasUnread ? "font-bold" : "font-semibold"}`}
                      >
                        {session.title}
                      </span>
                      <span className="block truncate text-[12px] text-muted">
                        {session.hasUnread ? "New reply from the house" : timeAgo(session.lastMessageAt)}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] text-muted">{shortAgo(session.lastMessageAt)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3 lg:hidden">
          <Link href="/" className="flex items-center justify-center text-ink no-underline">
            <span className="material-symbols-rounded">arrow_back</span>
          </Link>
          <div className="flex-1">
            <div className="font-serif text-[19px] text-ink">Ask the house</div>
            <div className="font-mono text-[10px] tracking-wide text-accent">
              KNOWS {itemCount} {itemCount === 1 ? "THING" : "THINGS"} · {zoneCount} {zoneCount === 1 ? "ZONE" : "ZONES"}
            </div>
          </div>
          <TapButton
            type="button"
            onClick={() => setHistoryOpen(true)}
            aria-label="History"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border-none bg-transparent text-ink"
          >
            <span className="material-symbols-rounded text-[20px]">history</span>
          </TapButton>
        </div>

        {/* Desktop thread header */}
        <div className="hidden items-center gap-3 border-b border-border px-7 py-[18px] lg:flex">
          <div className="min-w-0 flex-1">
            <h2 className="m-0 truncate font-serif text-[20px] font-normal text-ink">
              {activeSession?.title ?? (messages[0]?.role === "user" ? messages[0].content : "New conversation")}
            </h2>
            <div className="font-mono text-[10px] text-accent">
              KNOWS {itemCount} {itemCount === 1 ? "THING" : "THINGS"} · {zoneCount}{" "}
              {zoneCount === 1 ? "ZONE" : "ZONES"}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-5 py-[18px] lg:py-6">
          <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-[14px] lg:max-w-[680px] lg:gap-4">
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col gap-[22px] pt-9 lg:items-center lg:justify-center lg:pt-0 lg:text-center">
                <div className="flex flex-col gap-2">
                  <div className="font-serif text-[30px] leading-tight text-ink lg:text-[32px]">
                    What are you looking for, {userName.split(" ")[0]}?
                  </div>
                  <div className="text-[14px] leading-relaxed text-muted lg:max-w-[400px]">
                    Ask about anything in the house, garden, garage or shed. I can also move things and set reminders.
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <TapButton
                      key={s.q}
                      type="button"
                      onClick={() => sendMessage(s.q)}
                      className="flex cursor-pointer items-center gap-3 rounded-[14px] border border-border bg-card px-[14px] py-3 text-left lg:px-4"
                    >
                      <span className="h-[10px] w-[10px] flex-none rounded-[3px]" style={{ background: s.c }} />
                      <span className="flex-1 text-[15px] text-ink">{s.q}</span>
                      <span className="material-symbols-rounded text-[18px] text-faint">north_west</span>
                    </TapButton>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => {
                const resolution = resolvedActions[message.id];
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={`flex flex-col gap-1 ${isUser ? "max-w-[80%] items-end self-end" : "max-w-[85%] items-start self-start"}`}
                  >
                    {message.pendingAction ? (
                      <div className="flex flex-col gap-2">
                        <div className="text-[15px] leading-relaxed text-body">
                          <MessageContent content={message.content} />
                        </div>
                        {resolution === "cancelled" ? (
                          <p className="text-xs text-muted">Cancelled — no changes made.</p>
                        ) : resolution === "confirmed" ? null : (
                          <ActionCard
                            action={message.pendingAction}
                            onConfirm={() => handleConfirmAction(message.id, message.pendingAction!)}
                            onCancel={() => handleCancelAction(message.id)}
                          />
                        )}
                      </div>
                    ) : isUser ? (
                      <div className="rounded-2xl rounded-br-sm bg-inverse px-[15px] py-[11px] text-[15px] text-inverse-ink lg:rounded-[16px_16px_4px_16px] lg:px-4 lg:py-3">
                        {message.content}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="text-[15px] leading-relaxed text-body lg:text-[16px] lg:leading-[1.6]">
                          <MessageContent content={message.content} />
                        </div>
                        {message.referencedItems && message.referencedItems.length > 0 && (
                          <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-card">
                            {message.referencedItems.map((item) => (
                              <Link
                                key={item.id}
                                href={`/items/${item.id}`}
                                className="flex items-center gap-3 px-3 py-[10px] no-underline"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL */}
                                <img
                                  src={item.photoUrl}
                                  alt={item.name}
                                  className="h-10 w-10 rounded-[10px] object-cover"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-semibold text-ink">{item.name}</div>
                                </div>
                                <span className="material-symbols-rounded text-accent">near_me</span>
                              </Link>
                            ))}
                          </div>
                        )}
                        {message.viewHref && (
                          <Link href={message.viewHref} className="text-xs font-semibold text-accent no-underline">
                            {message.viewHrefLabel ?? "View"} →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {pending && (
              <div className="mt-1 flex items-center gap-2 self-start text-sm text-muted">
                <TypingDots />
                <span>
                  <span className="lg:hidden">Thinking…</span>
                  <span className="hidden lg:inline">Walking the garden, garage and shed…</span>
                </span>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-1 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Input bar */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-4 pb-[10px] pt-[6px] lg:mx-auto lg:mb-6 lg:w-[min(680px,calc(100%-48px))] lg:rounded-[14px] lg:border lg:border-border lg:bg-card lg:py-[6px] lg:pl-[14px] lg:pr-[6px]"
        >
          <Link
            href="/capture"
            aria-label="Add a photo"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-ink no-underline lg:h-auto lg:w-auto lg:border-0 lg:bg-transparent lg:text-muted"
          >
            <span className="material-symbols-rounded">photo_camera</span>
          </Link>
          <div className="flex min-h-12 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-[14px] lg:min-h-10 lg:border-0 lg:bg-transparent lg:px-0">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={1}
              placeholder="Ask about any room or the yard…"
              aria-label="Message"
              className="max-h-32 w-full resize-none border-none bg-transparent py-3 text-[15px] leading-snug text-body outline-none [field-sizing:content] placeholder:text-muted lg:py-2"
            />
            {!input && (
              <span className="hidden shrink-0 font-mono text-[10px] text-muted lg:inline">⏎ SEND · ⇧⏎ NEW LINE</span>
            )}
          </div>
          <button
            type="submit"
            disabled={!pending && !input.trim()}
            aria-label={pending ? "Stop reply" : "Send"}
            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border-none bg-accent text-on-accent disabled:opacity-50 lg:h-10 lg:w-10 lg:rounded-[10px] lg:bg-ink lg:text-surface"
          >
            <span className="material-symbols-rounded">{pending ? "stop" : "arrow_upward"}</span>
          </button>
        </form>
      </div>

      <div className="lg:hidden">
        <HistorySheet
          open={historyOpen}
          sessions={sessions}
          activeSessionId={sessionId}
          loadingSessionId={loadingSessionId}
          onClose={() => setHistoryOpen(false)}
          onSelect={switchToSession}
          onNewChat={startNewChat}
        />
      </div>
    </div>
  );
}
