"use client";

import { useState } from "react";
import type { UserRole } from "@/types/inventory";
import type { InventoryFiltersState } from "@/components/inventory/InventoryFilters";

type Props = {
  role: UserRole;
  onApplyFilters: (next: Partial<InventoryFiltersState>) => void;
};

export function AIPanel({ role, onApplyFilters }: Props) {
  const [nlQuery, setNlQuery] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [restock, setRestock] = useState<Array<Record<string, unknown>>>([]);
  const [restockLoading, setRestockLoading] = useState(false);

  const canRestock = role === "admin" || role === "manager";

  async function runNlSearch() {
    setNlLoading(true);
    try {
      const res = await fetch("/api/ai/nl-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nlQuery }),
      });
      const json = await res.json();
      if (json.filters) onApplyFilters(json.filters);
    } finally {
      setNlLoading(false);
    }
  }

  async function runRestock() {
    if (!canRestock) return;
    setRestockLoading(true);
    try {
      const res = await fetch("/api/ai/restock", { method: "POST" });
      const json = await res.json();
      setRestock(Array.isArray(json.data) ? json.data : []);
    } finally {
      setRestockLoading(false);
    }
  }

  return (
    <section className="space-y-3 rounded border p-4">
      <h3 className="text-sm font-semibold">AI Panel</h3>
      <div className="space-y-2">
        <p className="text-xs text-gray-600">Natural language search</p>
        <div className="flex gap-2">
          <input
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            className="w-full rounded border p-2"
            placeholder="Show low stock electronics in warehouse A under 10 units"
          />
          <button
            onClick={runNlSearch}
            disabled={nlLoading}
            className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
          >
            {nlLoading ? "Parsing..." : "Apply"}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-gray-600">Restock suggestions</p>
        <button
          onClick={runRestock}
          disabled={restockLoading || !canRestock}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {restockLoading ? "Thinking..." : "Generate Restock Plan"}
        </button>
        <div className="space-y-1 text-sm">
          {restock.map((s, idx) => (
            <div key={idx} className="rounded border p-2">
              <pre className="whitespace-pre-wrap">{JSON.stringify(s, null, 2)}</pre>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
