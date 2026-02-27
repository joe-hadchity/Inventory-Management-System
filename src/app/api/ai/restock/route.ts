import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStructuredAiJson } from "@/lib/ai";
import { restockResponseSchema } from "@/lib/validation";

type RestockJson = { suggestions: unknown };

export async function POST() {
  const auth = await requireRole(["admin", "manager"]);
  if (!auth.ok) return auth.response;

  const supabase = await createServerSupabaseClient();
  const { data: items, error } = await supabase
    .from("inventory_items")
    .select("id,name,quantity,reorder_threshold,status,supplier,category");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const fallback = (items ?? [])
    .filter(
      (item) =>
        item.status !== "discontinued" &&
        (item.reorder_threshold ?? 0) >= item.quantity,
    )
    .map((item) => ({
      item_id: item.id,
      reason: "Quantity is at or below threshold",
      recommended_order_qty:
        (item.reorder_threshold ?? 0) - item.quantity + Math.max(5, Math.ceil(item.quantity * 0.2)),
      urgency: item.quantity === 0 ? "high" : "medium",
    }));

  try {
    const aiOutput = await getStructuredAiJson<RestockJson>(
      [
        "You are an inventory planner.",
        "Return strict JSON object with key suggestions.",
        "suggestions must be an array of {item_id, reason, recommended_order_qty, urgency}.",
        "urgency must be low|medium|high.",
        "Never include markdown.",
      ].join(" "),
      JSON.stringify({ items }, null, 2),
    );

    const parsed = restockResponseSchema.safeParse(aiOutput.suggestions);
    if (!parsed.success) {
      return NextResponse.json({ data: fallback, source: "fallback" });
    }
    return NextResponse.json({ data: parsed.data, source: "ai" });
  } catch {
    return NextResponse.json({ data: fallback, source: "fallback" });
  }
}
