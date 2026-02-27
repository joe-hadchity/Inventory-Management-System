"use client";

import type { Category, InventoryStatus } from "@/types/inventory";

export type InventoryFiltersState = {
  q: string;
  categoryId: string;
  status: "" | InventoryStatus;
  maxQuantity: string;
  location: string;
  supplier: string;
  lowStockOnly: boolean;
  sortBy: "name" | "quantity" | "updated_at" | "category";
  sortDir: "asc" | "desc";
};

type Props = {
  value: InventoryFiltersState;
  onChange: (next: InventoryFiltersState) => void;
  categories: Category[];
};

export function InventoryFilters({ value, onChange, categories }: Props) {
  return (
    <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
      <input
        className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
        placeholder="Search by name"
        value={value.q}
        onChange={(e) => onChange({ ...value, q: e.target.value })}
      />
      <select
        className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
        value={value.categoryId}
        onChange={(e) => onChange({ ...value, categoryId: e.target.value })}
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <select
        className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
        value={value.status}
        onChange={(e) =>
          onChange({
            ...value,
            status: e.target.value as InventoryFiltersState["status"],
          })
        }
      >
        <option value="">All statuses</option>
        <option value="in_stock">in_stock</option>
        <option value="low_stock">low_stock</option>
        <option value="ordered">ordered</option>
        <option value="discontinued">discontinued</option>
      </select>
      <input
        className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
        placeholder="Max quantity"
        value={value.maxQuantity}
        onChange={(e) => onChange({ ...value, maxQuantity: e.target.value })}
      />
      <input
        className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
        placeholder="Location"
        value={value.location}
        onChange={(e) => onChange({ ...value, location: e.target.value })}
      />
      <input
        className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
        placeholder="Supplier"
        value={value.supplier}
        onChange={(e) => onChange({ ...value, supplier: e.target.value })}
      />
      <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-slate-700">
        <input
          type="checkbox"
          checked={value.lowStockOnly}
          onChange={(e) => onChange({ ...value, lowStockOnly: e.target.checked })}
        />
        Low stock only
      </label>
      <select
        className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
        value={value.sortBy}
        onChange={(e) =>
          onChange({
            ...value,
            sortBy: e.target.value as InventoryFiltersState["sortBy"],
          })
        }
      >
        <option value="updated_at">Sort: updated</option>
        <option value="name">Sort: name</option>
        <option value="quantity">Sort: quantity</option>
        <option value="category">Sort: category</option>
      </select>
      <select
        className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
        value={value.sortDir}
        onChange={(e) =>
          onChange({
            ...value,
            sortDir: e.target.value as InventoryFiltersState["sortDir"],
          })
        }
      >
        <option value="desc">DESC</option>
        <option value="asc">ASC</option>
      </select>
    </div>
  );
}
