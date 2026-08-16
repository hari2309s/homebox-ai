"use client";

import { Button, FadeIn, Input, Spinner, StaggerItem, StaggerList } from "@homebox-ai/ui";
import { motion } from "framer-motion";
import type { ComponentProps, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { PendingAction } from "@homebox-ai/ai";

import { confirmChatActionAction, listChatSessionsAction, loadChatSessionAction } from "./actions";
import { ActionCard } from "./action-card";
import { HistorySheet } from "./history-sheet";
import { MessageContent } from "./message-content";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pendingAction?: PendingAction;
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(sessionId);

  useEffect(() => {
    listChatSessionsAction()
      .then(setSessions)
      .catch(() => {});
    setHeaderActionsEl(document.getElementById("header-actions"));
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
    setHistoryOpen(false);
    if (id === sessionId) return;
    setError(null);
    setMessages([]);
    setResolvedActions({});
    setSessionId(id);
    try {
      const history = await loadChatSessionAction(id);
      setMessages(history);
    } catch {
      setError("Couldn't load that conversation");
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

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }]);
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
      let data: { reply?: string; error?: string; pendingAction?: PendingAction } = {};
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
          { id: crypto.randomUUID(), role: "assistant", content: data.reply!, pendingAction: data.pendingAction },
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
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  async function handleConfirmAction(messageId: string, action: PendingAction) {
    const requestSessionId = sessionIdRef.current;
    try {
      const result = await confirmChatActionAction(requestSessionId, action);
      if (sessionIdRef.current !== requestSessionId) return;
      setResolvedActions((prev) => ({ ...prev, [messageId]: "confirmed" }));
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: result.message }]);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
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
    <div className="flex h-full flex-col bg-white">
      {headerActionsEl &&
        createPortal(
          <>
            <button
              type="button"
              onClick={startNewChat}
              aria-label="New chat"
              className="cursor-pointer rounded-md border-none bg-transparent p-1 text-ink transition-colors duration-150 hover:text-accent"
            >
              <NewChatIcon className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-label="Conversation history"
              className="cursor-pointer rounded-md border-none bg-transparent p-1 text-ink transition-colors duration-150 hover:text-accent"
            >
              <HistoryIcon className="h-5 w-5 md:h-6 md:w-6" />
            </button>
          </>,
          headerActionsEl,
        )}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
          {messages.length === 0 ? (
            <FadeIn className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-muted">Ask about your inventory in plain English.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="cursor-pointer rounded-full border border-border bg-surface-soft px-3 py-1.5 text-sm text-body transition-colors duration-150 hover:border-accent"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </FadeIn>
          ) : (
            <StaggerList className="m-0 flex list-none flex-col gap-3 p-0">
              {messages.map((message) => {
                const resolution = resolvedActions[message.id];
                return (
                  <StaggerItem
                    key={message.id}
                    className={
                      message.pendingAction
                        ? "max-w-[85%] self-start"
                        : `max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                            message.role === "user"
                              ? "self-end whitespace-pre-wrap rounded-br-sm bg-accent text-white"
                              : "self-start rounded-bl-sm border border-border bg-surface-soft text-body"
                          }`
                    }
                  >
                    {message.pendingAction ? (
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
                    ) : message.role === "assistant" ? (
                      <MessageContent content={message.content} />
                    ) : (
                      message.content
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

          <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 justify-center gap-2 border-t border-border bg-white p-4 sm:p-6"
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
        onClose={() => setHistoryOpen(false)}
        onSelect={switchToSession}
        onNewChat={startNewChat}
      />
    </div>
  );
}
