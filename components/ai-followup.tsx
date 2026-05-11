"use client";

import { useState } from "react";
import { SparkleIcon } from "./icons";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Why did % to PH change vs. expectations for this project type?",
  "What are the biggest data quality issues to fix first?",
  "Which subpopulation is underperforming on outcomes?",
  "What does the income trajectory look like for adults?",
];

export function AiFollowup({ reportRunId }: { reportRunId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({
          reportRunId,
          question,
          history: messages,
        }),
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
    <section className="rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <SparkleIcon size={16} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Ask a follow-up</h3>
          <p className="text-xs text-muted-foreground">
            Conversational analysis grounded in this report&apos;s data.
          </p>
        </div>
      </div>

      {messages.length === 0 && (
        <div className="mt-5">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Try one of these
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                disabled={busy}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:border-accent/40 hover:bg-muted disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="mt-5 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-4 ${
                m.role === "user"
                  ? "border-accent/30 bg-accent/5"
                  : "border-border bg-background"
              }`}
            >
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {m.role === "user" ? "You" : "AI"}
              </div>
              <div className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
              Thinking…
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="mt-5 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          placeholder="Ask anything about this APR…"
          className="flex-1 rounded-full border border-border bg-input px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </section>
  );
}
