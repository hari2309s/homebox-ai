"use client";

import { AnimatedHomeboxIcon, Button, FadeIn, Input, Spinner, StaggerItem, StaggerList, TapButton } from "@homebox-ai/ui";
import { motion } from "framer-motion";
import Link from "next/link";
import type { ComponentProps, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { PendingAction } from "@homebox-ai/ai";

import { createSupabaseBrowserClient } from "@homebox-ai/supabase/client";

import { confirmChatActionAction, listChatSessionsAction, loadChatSessionAction } from "./actions";
import { ActionCard } from "./action-card";
import { HistorySheet } from "./history-sheet";
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
  /** Set on the confirmation-result message after a pending action succeeds — where the confirmed thing now lives, so the user can jump straight to it. */
  viewHref?: string;
  viewHrefLabel?: string;
  /** Items with cover photos that the AI referenced this turn — shown as clickable thumbnails below the text. Ephemeral (not persisted to DB). */
  referencedItems?: ReferencedItem[];
  /** ISO timestamp — from DB on history load, set client-side for new messages. */
  createdAt?: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return isToday ? time : `${d.toLocaleDateString([], { month: "short", day: "numeric" })} · ${time}`;
}

interface ChatSession {
  sessionId: string;
  title: string;
  lastMessageAt: string;
  hasUnread: boolean;
}

const SUGGESTIONS = ["Where's my passport?", "What's in the garage?", "Anything with a warranty expiring soon?"];

function HistoryIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12a9 9 0 1 0 2.6-6.36" />
      <path d="M3 4v5h5" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

function NewChatIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export default function ChatPage() {
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [headerActionsEl, setHeaderActionsEl] = useState<HTMLElement | null>(null);
  // Which pending-action cards have already been acted on, keyed by the
  // assistant message id that carried them — a card only ever renders once
  // per message, so this is enough to hide it after confirm/cancel without
  // needing to mutate the message list itself.
  const [resolvedActions, setResolvedActions] = useState<Record<string, "confirmed" | "cancelled">>({});
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(sessionId);

  // Scrolls the actual scrolling element to its true bottom (so the
  // container's own bottom padding is part of what ends up visible) —
  // scrollIntoView() on a small anchor element instead would align just that
  // element's own edge into view, which left barely any breathing room
  // above the input bar.
  function scrollToBottom() {
    scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: "smooth" });
  }

  useEffect(() => {
    listChatSessionsAction()
      .then(setSessions)
      .catch(() => {});
    setHeaderActionsEl(document.getElementById("header-actions"));
    // Fetch avatar URL from the current session's user metadata.
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        const url = data.user?.user_metadata?.avatar_url;
        if (typeof url === "string") setMyAvatarUrl(url);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  function startNewChat() {
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setError(null);
    setResolvedActions({});
    setHistoryOpen(false);
  }

  async function switchToSession(id: string) {
    if (id === sessionId) { setHistoryOpen(false); return; }
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

    // Capture which session this request belongs to. The user can start a new
    // chat or switch conversations while this request is still in flight (the
    // header's "New chat" / history controls are always reachable), so the
    // response must only be applied if that session is still the active one.
    const requestSessionId = sessionId;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed, createdAt: new Date().toISOString() }]);
    setInput("");
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, sessionId: requestSessionId }),
      });

      // A crashed/timed-out function can return an empty or non-JSON body —
      // parse defensively instead of letting `.json()` throw a raw parse error.
      let data: { reply?: string; error?: string; pendingAction?: PendingAction; referencedItems?: ReferencedItem[] } =
        {};
      try {
        data = await response.json();
      } catch {
        // handled by the `!response.ok` / missing-reply checks below
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
      if (sessionIdRef.current === requestSessionId) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      setPending(false);
      requestAnimationFrame(scrollToBottom);
    }
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
      requestAnimationFrame(scrollToBottom);

      // Auto-continue: re-invoke the agent so it can propose the next step of
      // the original request (e.g. "add item to Backyard" after Backyard was just
      // confirmed-created) without forcing the user to re-state the request.
      // isContinuation=true keeps the synthetic "Continue." prompt out of the
      // saved history so the conversation stays coherent on reload.
      setPending(true);
      setError(null);
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Continue.", sessionId: requestSessionId, isContinuation: true }),
        });
        let data: { reply?: string; error?: string; pendingAction?: PendingAction; referencedItems?: ReferencedItem[] } =
          {};
        try {
          data = await response.json();
        } catch {
          // handled below
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
          requestAnimationFrame(scrollToBottom);
        }
      } catch {
        // Swallow continuation errors — the primary action already succeeded and
        // was shown; losing the auto-follow-up is acceptable, the user can still
        // type a follow-up themselves.
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
    sendMessage(input);
  }

  return (
    <div className="flex h-full flex-col bg-card">
      {headerActionsEl &&
        createPortal(
          <>
            <TapButton
              type="button"
              onClick={startNewChat}
              aria-label="New chat"
              className="cursor-pointer rounded-md border-none bg-transparent p-1 text-ink transition-colors duration-150 hover:text-accent"
            >
              <NewChatIcon className="h-5 w-5 md:h-6 md:w-6" />
            </TapButton>
            <TapButton
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-label="Conversation history"
              className="cursor-pointer rounded-md border-none bg-transparent p-1 text-ink transition-colors duration-150 hover:text-accent"
            >
              <HistoryIcon className="h-5 w-5 md:h-6 md:w-6" />
            </TapButton>
          </>,
          headerActionsEl,
        )}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col">
          {messages.length === 0 ? (
            <FadeIn className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-muted">Ask about your inventory in plain English.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <TapButton
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="cursor-pointer rounded-full border border-border bg-surface-soft px-3 py-1.5 text-sm text-body transition-colors duration-150 hover:border-accent"
                  >
                    {suggestion}
                  </TapButton>
                ))}
              </div>
            </FadeIn>
          ) : (
            <StaggerList className="m-0 flex list-none flex-col gap-3 p-0">
              {messages.map((message) => {
                const resolution = resolvedActions[message.id];
                const isUser = message.role === "user";
                return (
                  <StaggerItem
                    key={message.id}
                    className={`flex flex-col gap-0.5 ${
                      message.pendingAction
                        ? "max-w-[85%] self-start items-start"
                        : isUser
                          ? "max-w-[80%] self-end items-end"
                          : "max-w-[80%] self-start items-start"
                    }`}
                  >
                    {message.pendingAction ? (
                      <div className="flex items-start gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card mt-0.5">
                          <AnimatedHomeboxIcon size={22} className="h-full w-full" />
                        </div>
                        <div className="flex flex-col gap-2">
                        <div className="rounded-2xl rounded-bl-sm border border-border bg-surface-soft px-4 py-2.5 text-sm text-body">
                          <MessageContent content={message.content} />
                        </div>
                        {resolution === "cancelled" ? (
                          <p className="m-0 text-xs text-muted">Cancelled — no changes made.</p>
                        ) : resolution === "confirmed" ? null : (
                          <ActionCard
                            action={message.pendingAction}
                            onConfirm={() => handleConfirmAction(message.id, message.pendingAction!)}
                            onCancel={() => handleCancelAction(message.id)}
                          />
                        )}
                        </div>
                      </div>
                    ) : isUser ? (
                      <div className="flex items-end gap-2">
                        <div className="rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-sm text-white whitespace-pre-wrap">
                          {message.content}
                        </div>
                        {myAvatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL
                          <img src={myAvatarUrl} alt="You" className="h-6 w-6 shrink-0 rounded-lg border border-border object-cover" />
                        ) : (
                          <div className="h-6 w-6 shrink-0 rounded-lg border border-border bg-accent/40" />
                        )}
                      </div>
                    ) : (
                      <div className="flex items-end gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
                          <AnimatedHomeboxIcon size={22} className="h-full w-full" />
                        </div>
                        <div className="rounded-2xl rounded-bl-sm border border-border bg-surface-soft px-4 py-2.5 text-sm text-body">
                        <div className="flex flex-col gap-1.5">
                          <MessageContent content={message.content} />
                          {message.referencedItems && message.referencedItems.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {message.referencedItems.map((item) => (
                                <Link
                                  key={item.id}
                                  href={`/items/${item.id}`}
                                  className="group flex flex-col overflow-hidden rounded-xl border border-border transition-opacity duration-150 hover:opacity-80"
                                  style={{ width: message.referencedItems!.length === 1 ? "100%" : "calc(50% - 4px)" }}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not a static asset */}
                                  <img
                                    src={item.photoUrl}
                                    alt={item.name}
                                    className="aspect-video w-full object-cover"
                                  />
                                  <div className="bg-surface-soft px-2.5 py-1.5 text-xs font-medium text-body">
                                    {item.name}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          )}
                          {message.viewHref && (
                            <Link
                              href={message.viewHref}
                              className="self-start text-xs font-semibold text-accent-hover underline underline-offset-4"
                            >
                              {message.viewHrefLabel ?? "View"} →
                            </Link>
                          )}
                        </div>
                      </div>
                      </div>
                    )}
                    {message.createdAt && (
                      <span className="px-1 text-[10px] text-muted">{formatTime(message.createdAt)}</span>
                    )}
                  </StaggerItem>
                );
              })}
            </StaggerList>
          )}

          {pending && (
            <div className="mt-3 flex w-fit items-center self-start rounded-2xl rounded-bl-sm border border-border bg-surface-soft px-4 py-3">
              <TypingDots />
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 rounded-md bg-accent/10 px-3 py-2 text-sm text-accent-hover">
              {error}
            </p>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 justify-center gap-2 border-t border-border bg-card p-4 sm:p-6"
      >
        <div className="mx-auto flex w-full max-w-2xl gap-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about your inventory…"
            className="flex-1"
            disabled={pending}
          />
          <Button type="submit" disabled={pending || !input.trim()}>
            {pending ? <Spinner size={16} /> : "Send"}
          </Button>
        </div>
      </form>

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
  );
}
