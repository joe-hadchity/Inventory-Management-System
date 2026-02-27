"use client";

import { useCallback, useEffect, useState } from "react";
import { InventoryFilters, type InventoryFiltersState } from "./InventoryFilters";
import { InventoryTable } from "./InventoryTable";
import { InventoryForm } from "./InventoryForm";
import { SupplierDraftAssistant } from "./SupplierDraftAssistant";
import { InventoryDataChat } from "./InventoryDataChat";
import type { Category, InventoryItem, UserRole } from "@/types/inventory";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const defaultFilters: InventoryFiltersState = {
  q: "",
  categoryId: "",
  status: "",
  maxQuantity: "",
  location: "",
  supplier: "",
  lowStockOnly: false,
  sortBy: "updated_at",
  sortDir: "desc",
};

type Props = {
  role: UserRole;
};

export function InventoryPageClient({ role }: Props) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [editing, setEditing] = useState<InventoryItem | undefined>(undefined);
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

  const canEdit = role === "admin" || role === "manager";

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== false) params.set(key, String(value));
    });
    const res = await fetch(`/api/items?${params.toString()}`, {
      cache: "no-store",
    });
    const json = await res.json();
    setItems(Array.isArray(json.data) ? json.data : []);
  }, [filters]);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories", { cache: "no-store" });
    const json = await res.json();
    setCategories(Array.isArray(json.data) ? json.data : []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, [fetchCategories]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-4">
      <header className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">Role: {role}</p>
        </div>
        <div className="flex gap-2">
          {canEdit ? (
            <button
              onClick={() => {
                setShowCreate((v) => !v);
                setEditing(undefined);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
            >
              {showCreate ? "Close" : "Add Item"}
            </button>
          ) : null}
          <button
            onClick={signOut}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </header>

      <InventoryFilters
        value={filters}
        onChange={setFilters}
        categories={categories}
      />

      <InventoryDataChat />

      {(role === "admin" || role === "manager") && (
        <SupplierDraftAssistant role={role} />
      )}

      {showCreate ? (
        <InventoryForm
          canEdit={canEdit}
          categories={categories}
          onSaved={() => {
            setShowCreate(false);
            fetchItems();
          }}
        />
      ) : null}

      {editing ? (
        <InventoryForm
          item={editing}
          canEdit={canEdit}
          categories={categories}
          onSaved={() => {
            setEditing(undefined);
            fetchItems();
          }}
        />
      ) : null}

      <InventoryTable
        items={items}
        role={role}
        onEdit={(item) => {
          setEditing(item);
          setShowCreate(false);
        }}
        onDeleted={fetchItems}
      />
    </main>
  );
}
