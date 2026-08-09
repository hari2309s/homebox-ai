"use client";

import { Button, FadeIn, Input, Spinner, StaggerItem, StaggerList } from "@homebox-ai/ui";
import type { FormEvent } from "react";
import { useRef, useState } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Where's my passport?",
  "What's in the garage?",
  "Anything with a warranty expiring soon?",
];

export default function ChatPage() {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }]);
    setInput("");
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, sessionId }),
      });

      // A crashed/timed-out function can return an empty or non-JSON body —
      // parse defensively instead of letting `.json()` throw a raw parse error.
      let data: { reply?: string; error?: string } = {};
      try {
        data = await response.json();
      } catch {
        // handled by the `!response.ok` / missing-reply checks below
      }

      if (!response.ok) throw new Error(data.error ?? "Something went wrong");
      if (!data.reply) throw new Error("Something went wrong");
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: data.reply! }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex h-full flex-col bg-surface-soft">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 ? (
          <FadeIn className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted">Ask about your inventory in plain English.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => sendMessage(suggestion)}
                  className="cursor-pointer rounded-full border border-border bg-white px-3 py-1.5 text-sm text-body transition-colors duration-150 hover:border-accent"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </FadeIn>
        ) : (
          <StaggerList className="m-0 flex list-none flex-col gap-3 p-0">
            {messages.map((message) => (
              <StaggerItem
                key={message.id}
                className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-4 py-2.5 text-sm ${
                  message.role === "user" ? "self-end bg-accent text-white" : "self-start bg-white text-body"
                }`}
              >
                {message.content}
              </StaggerItem>
            ))}
          </StaggerList>
        )}

        {pending && (
          <div className="mt-3 flex w-fit items-center gap-2 self-start rounded-lg bg-white px-4 py-2.5 text-muted">
            <Spinner size={16} />
            <span className="text-sm">Thinking…</span>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 rounded-md bg-accent/10 px-3 py-2 text-sm text-accent-hover">
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex shrink-0 gap-2 border-t border-border bg-white p-4 sm:p-6">
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
      </form>
    </div>
  );
}
