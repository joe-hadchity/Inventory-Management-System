import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStructuredAiJson } from "@/lib/ai";
import { supplierDraftsResponseSchema } from "@/lib/validation";

type SupplierDraftsJson = { drafts: unknown };

type InventoryRow = {
  sku: string | null;
  name: string;
  quantity: number;
  reorder_threshold: number | null;
  supplier: string | null;
  status: "in_stock" | "low_stock" | "ordered" | "discontinued";
};

function buildFallbackDrafts(items: InventoryRow[]) {
  const grouped = new Map<string, InventoryRow[]>();
  items.forEach((item) => {
    const supplier = item.supplier?.trim() || "General Supplier";
    if (!grouped.has(supplier)) grouped.set(supplier, []);
    grouped.get(supplier)!.push(item);
  });

  return Array.from(grouped.entries()).map(([supplier, supplierItems]) => {
    const lines = supplierItems.map((item) => {
      const threshold = item.reorder_threshold ?? 0;
      const qtyToOrder = Math.max(1, threshold - item.quantity + 5);
      return {
        sku: item.sku,
        name: item.name,
        qty_to_order: qtyToOrder,
        reason: "Quantity is below reorder threshold.",
      };
    });

    const bodyRows = lines
      .map(
        (line) =>
          `- ${line.name} (${line.sku ?? "no-sku"}): qty ${line.qty_to_order}`,
      )
      .join("\n");

    return {
      supplier,
      subject: `Reorder Request - ${supplier}`,
      body: `Hello ${supplier} team,\n\nPlease prepare a quote/order for the following items:\n${bodyRows}\n\nThanks.`,
      items: lines,
    };
  });
}

export async function POST() {
  const auth = await requireRole(["admin", "manager"]);
  if (!auth.ok) return auth.response;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .select("sku,name,quantity,reorder_threshold,supplier,status")
    .neq("status", "discontinued");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = ((data ?? []) as InventoryRow[]).filter((item) => {
    if (item.status === "low_stock") return true;
    if (item.reorder_threshold === null) return false;
    return item.quantity <= item.reorder_threshold;
  });
  const fallback = buildFallbackDrafts(items);
  if (items.length === 0) {
    return NextResponse.json({ data: [], source: "fallback" });
  }

  try {
    const aiOutput = await getStructuredAiJson<SupplierDraftsJson>(
      [
        "You are a purchasing assistant for enterprise inventory teams.",
        "Return strict JSON object with key drafts.",
        "Each draft must have supplier, subject, body, and items.",
        "Each item must include sku, name, qty_to_order, reason.",
        "Do not include markdown.",
      ].join(" "),
      JSON.stringify({ items }, null, 2),
    );

    const parsed = supplierDraftsResponseSchema.safeParse(aiOutput.drafts);
    if (!parsed.success) {
      return NextResponse.json({ data: fallback, source: "fallback" });
    }

    return NextResponse.json({ data: parsed.data, source: "ai" });
  } catch {
    return NextResponse.json({ data: fallback, source: "fallback" });
  }
}
