"use client";

import { FormEvent, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTED_PROMPTS = [
  "What does this company do?",
  "Who is this product for?",
  "What are the pricing options?",
  "Summarize the homepage"
];

export function TestChat({ botId, status }: { botId: string; status: string }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const sendMessage = async (raw: string) => {
    const text = raw.trim();
    if (!text) return;

    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botId, message: text })
    });
    const data = await response.json();

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: data.answer ?? data.error ?? "No response" }
    ]);
    setLoading(false);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(input);
  };

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Test chatbot</h2>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-emerald-700">
          {status}
        </span>
      </div>
      <div className="mb-4 h-72 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 sm:h-80">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
            <p className="text-sm font-medium text-slate-900">Your bot is ready</p>
            <p className="mt-1 text-sm text-slate-600">
              Ask a question to test how it responds using the scraped website content.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 transition hover:border-brand-200 hover:text-brand-700"
                  key={prompt}
                  onClick={() => void sendMessage(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {messages.map((msg, index) => (
            <div
              key={`${msg.role}-${index}`}
              className={`max-w-[92%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "ml-auto bg-brand-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-900"
              }`}
            >
              {msg.role === "assistant" ? (
                <p className="mb-1 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  AI
                </p>
              ) : null}
              {msg.content}
            </div>
          ))}

          {loading ? (
            <div className="max-w-[75%] rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-500">
              <p className="mb-1 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                AI
              </p>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                <span className="ml-1 text-xs text-slate-500">Generating answer...</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={onSubmit}>
        <input
          className="input"
          disabled={loading}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="How does your pricing work?"
        />
        <button className="btn-primary w-full sm:w-auto" type="submit" disabled={loading}>
          {loading ? "Thinking..." : "Send"}
        </button>
      </form>
    </div>
  );
}
