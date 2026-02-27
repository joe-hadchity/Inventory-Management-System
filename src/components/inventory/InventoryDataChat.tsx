"use client";

import { useState } from "react";

type AssistantMessage = {
  question: string;
  answer: string;
  rows?: Record<string, unknown>[];
};

export function InventoryDataChat() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);

  async function askQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    const currentQuestion = question.trim();
    setQuestion("");

    try {
      const res = await fetch("/api/ai/chat-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentQuestion }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Request failed");

      setMessages((prev) => [
        {
          question: currentQuestion,
          answer: json.answer ?? "Done.",
          rows: Array.isArray(json.rows) ? json.rows : undefined,
        },
        ...prev,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Chat with your data</h2>
        <p className="text-sm text-slate-500">
          Ask inventory questions in natural language.
        </p>
      </div>

      <form onSubmit={askQuestion} className="flex gap-2">
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="e.g. show low stock items in warehouse A"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          disabled={loading}
          className="rounded-lg bg-slate-900 px-3 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Asking..." : "Ask"}
        </button>
      </form>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {messages.map((message, idx) => (
          <article key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-800">Q: {message.question}</p>
            <p className="mt-1 text-sm text-slate-700">{message.answer}</p>

            {message.rows && message.rows.length > 0 ? (
              <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      {Object.keys(message.rows[0]).map((key) => (
                        <th key={key} className="p-2 text-left">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {message.rows.slice(0, 20).map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-t border-slate-100">
                        {Object.values(row).map((value, colIdx) => (
                          <td key={colIdx} className="p-2 text-slate-700">
                            {String(value ?? "-")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
