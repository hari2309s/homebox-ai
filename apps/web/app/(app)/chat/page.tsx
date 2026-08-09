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
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Something went wrong");
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: data.reply }]);
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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Chat</h1>

      <div className="flex flex-col gap-3 rounded-lg bg-surface-soft p-4">
        {messages.length === 0 ? (
          <FadeIn className="flex flex-col items-center gap-3 py-6 text-center">
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
          <div className="flex w-fit items-center gap-2 self-start rounded-lg bg-white px-4 py-2.5 text-muted">
            <Spinner size={16} />
            <span className="text-sm">Thinking…</span>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-md bg-accent/10 px-3 py-2 text-sm text-accent-hover">
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
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
