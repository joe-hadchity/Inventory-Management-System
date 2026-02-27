"use client";

import type { InventoryItem, UserRole } from "@/types/inventory";

type Props = {
  items: InventoryItem[];
  role: UserRole;
  onEdit: (item: InventoryItem) => void;
  onDeleted: () => void;
};

export function InventoryTable({ items, role, onEdit, onDeleted }: Props) {
  const canEdit = role === "admin" || role === "manager";
  const canDelete = role === "admin";

  function statusClasses(status: InventoryItem["status"]) {
    if (status === "in_stock") {
      return "border-green-200 bg-green-50 text-green-700";
    }
    if (status === "low_stock") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }
    if (status === "ordered") {
      return "border-blue-200 bg-blue-50 text-blue-700";
    }
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  async function handleDelete(id: string) {
    if (!canDelete) return;
    if (!window.confirm("Delete this item?")) return;
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (res.ok) onDeleted();
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Qty</th>
            <th className="p-2">Category</th>
            <th className="p-2">Status</th>
            <th className="p-2">SKU</th>
            <th className="p-2">Location</th>
            <th className="p-2">Supplier</th>
            <th className="p-2">Updated</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="p-2">{item.name}</td>
              <td className="p-2">{item.quantity}</td>
              <td className="p-2">{item.category}</td>
              <td className="p-2">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusClasses(item.status)}`}
                >
                  {item.status}
                </span>
              </td>
              <td className="p-2">{item.sku ?? "-"}</td>
              <td className="p-2">{item.location ?? "-"}</td>
              <td className="p-2">{item.supplier ?? "-"}</td>
              <td className="p-2">
                {new Date(item.updated_at).toLocaleDateString()}
              </td>
              <td className="p-2">
                <div className="flex gap-2">
                  <button
                    disabled={!canEdit}
                    onClick={() => onEdit(item)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    disabled={!canDelete}
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
