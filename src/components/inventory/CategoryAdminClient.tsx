"use client";

import { useCallback, useEffect, useState } from "react";
import type { Category } from "@/types/inventory";

type Props = {
  meRole: string;
};

export function CategoryAdminClient({ meRole }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/categories", { method: "GET" });
    const json = await res.json();
    setCategories(Array.isArray(json.data) ? json.data : []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCategories();
  }, [loadCategories]);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: categoryName,
        description: categoryDescription || null,
      }),
    });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Failed to create category");
      return;
    }
    setCategoryName("");
    setCategoryDescription("");
    await loadCategories();
  }

  async function deleteCategory(id: string) {
    setError(null);
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Failed to delete category");
      return;
    }
    await loadCategories();
  }

  if (meRole !== "admin") {
    return <p className="p-4 text-sm">Only admins can manage categories.</p>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-4">
      <h1 className="text-2xl font-semibold text-slate-900">Category Management</h1>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <form
        onSubmit={createCategory}
        className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_2fr_auto]"
      >
        <input
          required
          className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="Category name"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
          placeholder="Description (optional)"
          value={categoryDescription}
          onChange={(e) => setCategoryDescription(e.target.value)}
        />
        <button className="rounded-lg bg-slate-900 px-3 py-2 text-white hover:bg-slate-800">
          Add Category
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="p-2">{category.name}</td>
                <td className="p-2">{category.description ?? "-"}</td>
                <td className="p-2">
                  <button
                    onClick={() => deleteCategory(category.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
