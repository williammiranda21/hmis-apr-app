"use client";

import { useEffect, useRef, useState } from "react";
import { SparkleIcon } from "./icons";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Why did % to PH change vs. expectations for this project type?",
  "What are the biggest data quality issues to fix first?",
  "Which subpopulation is underperforming on outcomes?",
  "What does the income trajectory look like for adults?",
];

export function AiFollowup({ reportRunId }: { reportRunId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, busy]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    setError(null);
    setBusy(true);
    const userMsg: Message = { role: "user", content: question };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    try {
      const res = await fetch("/api/analyze/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportRunId, question, history: messages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to get response.");
        setMessages(messages);
        return;
      }
      setMessages([...next, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setMessages(messages);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask a follow-up about this report"
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-2xl shadow-accent/30 transition-all hover:scale-105 hover:bg-accent-hover print-hide ${
          open ? "pointer-events-none scale-90 opacity-0" : "opacity-100"
        }`}
      >
        <SparkleIcon size={16} />
        <span className="hidden sm:inline">Ask AI</span>
        {messages.length > 0 && (
          <span className="ml-1 rounded-full bg-accent-foreground/15 px-1.5 py-0.5 text-[10px] font-bold">
            {messages.filter((m) => m.role === "assistant").length}
          </span>
        )}
      </button>

      {/* Backdrop (mobile only — gives a tap target to close) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm sm:hidden print-hide"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Chat panel */}
      <div
        className={`fixed bottom-4 left-4 right-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl print-hide transition-all sm:left-auto sm:bottom-6 sm:right-6 sm:w-[420px] sm:max-w-[calc(100vw-3rem)] ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
        style={{ height: "min(620px, calc(100vh - 5rem))" }}
        role="dialog"
        aria-label="AI follow-up chat"
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border bg-background px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <SparkleIcon size={14} />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Ask about this report</div>
              <div className="text-[10px] text-muted-foreground">
                Grounded in this APR&apos;s data
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div>
              <div className="text-xs text-muted-foreground">
                Try one to get started, or type your own question.
              </div>
              <div className="mt-3 space-y-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    disabled={busy}
                    className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-accent/40 hover:bg-muted disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-accent text-accent-foreground"
                  : "border border-border bg-background text-foreground"
              }`}
            >
              <div className="whitespace-pre-line">{m.content}</div>
            </div>
          ))}
          {busy && (
            <div className="max-w-[85%] rounded-2xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              Thinking…
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex gap-2 border-t border-border bg-background px-3 py-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            placeholder="Ask anything…"
            className="flex-1 rounded-full border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
}
