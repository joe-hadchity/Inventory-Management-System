"use client";

import { useMemo, useState } from "react";
import type { Category, InventoryItem, InventoryStatus } from "@/types/inventory";

type Props = {
  item?: InventoryItem;
  onSaved: () => void;
  canEdit: boolean;
  categories: Category[];
};

const statuses: InventoryStatus[] = [
  "in_stock",
  "low_stock",
  "ordered",
  "discontinued",
];

export function InventoryForm({ item, onSaved, canEdit, categories }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: item?.name ?? "",
    quantity: item?.quantity ?? 0,
    categoryId: item?.category_id ?? "",
    status: (item?.status ?? "in_stock") as InventoryStatus,
    sku: item?.sku ?? "",
    location: item?.location ?? "",
    supplier: item?.supplier ?? "",
    unit_cost: item?.unit_cost ?? 0,
    reorder_threshold: item?.reorder_threshold ?? 0,
    notes: item?.notes ?? "",
  });

  const title = useMemo(() => (item ? "Edit Item" : "Add Item"), [item]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setError(null);
    setLoading(true);
    try {
      const method = item ? "PATCH" : "POST";
      const url = item ? `/api/items/${item.id}` : "/api/items";
      const payload = {
        ...form,
        categoryId: form.categoryId,
        quantity: Number(form.quantity),
        unit_cost: Number(form.unit_cost),
        reorder_threshold: Number(form.reorder_threshold),
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"
    >
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="grid gap-2 md:grid-cols-3">
        <input
          required
          className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          required
          type="number"
          min={0}
          className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="Quantity"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
        />
        <select
          required
          className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
        >
          <option value="">Select category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
          value={form.status}
          onChange={(e) =>
            setForm({ ...form, status: e.target.value as InventoryStatus })
          }
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="SKU"
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="Location"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="Supplier"
          value={form.supplier}
          onChange={(e) => setForm({ ...form, supplier: e.target.value })}
        />
        <input
          type="number"
          min={0}
          className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="Unit Cost"
          value={form.unit_cost}
          onChange={(e) => setForm({ ...form, unit_cost: Number(e.target.value) })}
        />
        <input
          type="number"
          min={0}
          className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="Reorder Threshold"
          value={form.reorder_threshold}
          onChange={(e) =>
            setForm({ ...form, reorder_threshold: Number(e.target.value) })
          }
        />
      </div>
      <textarea
        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
        placeholder="Notes"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
      />
      <button
        disabled={loading || !canEdit}
        className="rounded-lg bg-slate-900 px-3 py-2 text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
