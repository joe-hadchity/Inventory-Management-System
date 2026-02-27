"use client";

import { useState } from "react";
import type { UserRole } from "@/types/inventory";

type DraftItem = {
  sku?: string | null;
  name: string;
  qty_to_order: number;
  reason: string;
};

type Draft = {
  supplier: string;
  subject: string;
  body: string;
  items: DraftItem[];
};

type Props = {
  role: UserRole;
};

export function SupplierDraftAssistant({ role }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [source, setSource] = useState<"ai" | "fallback" | "">("");

  const canGenerate = role === "admin" || role === "manager";

  async function generateDrafts() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/supplier-drafts", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to generate drafts");
      setDrafts(Array.isArray(json.data) ? json.data : []);
      setSource(json.source === "ai" ? "ai" : "fallback");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate drafts");
    } finally {
      setLoading(false);
    }
  }

  async function copyDraft(draft: Draft) {
    const text = `Subject: ${draft.subject}\n\n${draft.body}`;
    await navigator.clipboard.writeText(text);
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Supplier Reorder Draft Assistant
          </h2>
          <p className="text-sm text-slate-500">
            Generates ready-to-send reorder drafts from low-stock items.
          </p>
        </div>
        <button
          disabled={!canGenerate || loading}
          onClick={generateDrafts}
          className="rounded-lg bg-slate-900 px-3 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Drafts"}
        </button>
      </div>

      {source ? (
        <p className="text-xs text-slate-500">
          Source: {source === "ai" ? "AI-generated" : "Fallback template"}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {drafts.map((draft) => (
          <article
            key={draft.supplier}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">{draft.supplier}</h3>
              <button
                onClick={() => copyDraft(draft)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
              >
                Copy Email
              </button>
            </div>
            <p className="mb-1 text-sm text-slate-700">
              <span className="font-semibold">Subject:</span> {draft.subject}
            </p>
            <pre className="mb-2 whitespace-pre-wrap rounded bg-white p-2 text-xs text-slate-700">
              {draft.body}
            </pre>
            <ul className="space-y-1 text-sm text-slate-700">
              {draft.items.map((item, idx) => (
                <li key={`${draft.supplier}-${idx}`} className="rounded bg-white p-2">
                  {item.name} ({item.sku ?? "no-sku"}) - Order {item.qty_to_order}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
