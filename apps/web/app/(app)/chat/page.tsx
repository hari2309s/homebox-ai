"use client";

import { AnimatedHomeboxIcon, TapButton } from "@homebox-ai/ui";
import { motion } from "framer-motion";
import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

import type { PendingAction } from "@homebox-ai/ai";

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

const SUGGESTIONS = ["Where's my passport?", "What's in the garage?", "Anything expiring soon?"];

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-[2px]"
          style={{ background: ["#3f6b45", "#b0643f", "#8a7a4f"][i] }}
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
  const [resolvedActions, setResolvedActions] = useState<Record<string, "confirmed" | "cancelled">>({});
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(sessionId);

  function scrollToBottom() {
    scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: "smooth" });
  }

  useEffect(() => {
    listChatSessionsAction().then(setSessions).catch(() => {});
  }, []);

  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { scrollToBottom(); }, [messages, pending]);

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
      let data: { reply?: string; error?: string; pendingAction?: PendingAction; referencedItems?: ReferencedItem[] } = {};
      try { data = await response.json(); } catch { /* non-JSON body */ }
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
      listChatSessionsAction().then(setSessions).catch(() => {});
    } catch (err) {
      if (sessionIdRef.current === requestSessionId) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      setPending(false);
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
        { id: crypto.randomUUID(), role: "assistant", content: result.message, viewHref: result.href, viewHrefLabel: result.hrefLabel, createdAt: new Date().toISOString() },
      ]);

      setPending(true);
      setError(null);
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: "Continue.", sessionId: requestSessionId, isContinuation: true }),
        });
        let data: { reply?: string; error?: string; pendingAction?: PendingAction; referencedItems?: ReferencedItem[] } = {};
        try { data = await response.json(); } catch { /* non-JSON body */ }
        if (response.ok && data.reply && sessionIdRef.current === requestSessionId) {
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "assistant", content: data.reply!, pendingAction: data.pendingAction, referencedItems: data.referencedItems?.length ? data.referencedItems : undefined, createdAt: new Date().toISOString() },
          ]);
        }
      } catch { /* continuation errors are swallowed — primary action already succeeded */ } finally {
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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <AnimatedHomeboxIcon size={44} />
        <div className="flex-1">
          <div className="font-serif text-[19px] text-ink">Ask the house</div>
          <div className="font-mono text-[10px] tracking-wide text-accent">
            {sessions.length > 0 ? `${sessions.length} CONVERSATIONS` : "NEW CONVERSATION"}
          </div>
        </div>
        <TapButton
          type="button"
          onClick={startNewChat}
          aria-label="New chat"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border border-border bg-card text-ink"
        >
          <span className="material-symbols-rounded text-[18px]">add</span>
        </TapButton>
        <TapButton
          type="button"
          onClick={() => setHistoryOpen(true)}
          aria-label="History"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border border-border bg-card text-ink"
        >
          <span className="material-symbols-rounded text-[18px]">history</span>
        </TapButton>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-5 py-[18px]">
        <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-[14px]">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <AnimatedHomeboxIcon size={64} />
              <p className="text-sm text-muted">Ask about any room or the yard…</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <TapButton
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    className="cursor-pointer rounded-full bg-[#dfe8d6] px-[13px] py-[7px] text-[13px] font-semibold text-[#2c4d31] dark:bg-[#2c3e2e] dark:text-[#9cc68f]"
                  >
                    {s}
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
                    <div className="rounded-2xl rounded-br-sm bg-[#1f2622] px-[15px] py-[11px] text-[15px] text-[#fbfaf6] dark:bg-[#2c342f]">
                      {message.content}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="text-[15px] leading-relaxed text-body">
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
                              <img src={item.photoUrl} alt={item.name} className="h-10 w-10 rounded-[10px] object-cover" />
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
              <span>Thinking…</span>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-1 rounded-xl bg-[#ecdccd] px-3 py-2.5 text-sm text-[#5a2e18]">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 pb-[10px] pt-[6px]">
        <Link
          href="/capture"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-ink no-underline"
        >
          <span className="material-symbols-rounded">photo_camera</span>
        </Link>
        <div className="flex h-12 flex-1 items-center rounded-xl border border-border bg-card px-[14px]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any room or the yard…"
            disabled={pending}
            className="w-full border-none bg-transparent text-[15px] text-body outline-none placeholder:text-muted"
          />
        </div>
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border-none bg-accent text-white disabled:opacity-50"
        >
          <span className="material-symbols-rounded">arrow_upward</span>
        </button>
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
