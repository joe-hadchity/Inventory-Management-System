import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { getStructuredAiJson } from "@/lib/ai";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { chatDataIntentSchema, chatDataRequestSchema } from "@/lib/validation";

type IntentJson = { intent: unknown };

type ChatAction =
  | "list_items"
  | "count_low_stock"
  | "group_by_category"
  | "group_by_supplier";

type ChatFilters = {
  q?: string;
  category?: string;
  status?: "in_stock" | "low_stock" | "ordered" | "discontinued";
  maxQuantity?: number;
  location?: string;
  supplier?: string;
  lowStockOnly?: boolean;
  sortBy?: "name" | "quantity" | "updated_at" | "category";
  sortDir?: "asc" | "desc";
};

type ChatIntent = {
  action: ChatAction;
  filters: ChatFilters;
  limit: number;
};

type ChatRow = {
  name: string;
  quantity: number;
  status: string;
  supplier: string | null;
  location: string | null;
  category: string;
};

function compactFilters(filters: ChatFilters): ChatFilters {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined),
  ) as ChatFilters;
}

function extractDeterministicFilters(message: string): ChatFilters {
  const lower = message.toLowerCase();
  const filters: ChatFilters = {};

  const warehouseMatch = message.match(
    /\b(?:from|in)\s+(warehouse\s+[a-z0-9-]+)\b/i,
  );
  if (warehouseMatch?.[1]) {
    filters.location = warehouseMatch[1].trim();
  }

  if (lower.includes("low stock")) {
    filters.lowStockOnly = true;
    filters.status = "low_stock";
  }
  if (lower.includes("discontinued")) filters.status = "discontinued";
  if (lower.includes("ordered")) filters.status = "ordered";
  if (lower.includes("in stock")) filters.status = "in_stock";

  const underMatch = lower.match(/\b(?:under|below|less than)\s+(\d+)\b/);
  if (underMatch?.[1]) {
    filters.maxQuantity = Number(underMatch[1]);
  }

  return compactFilters(filters);
}

function fallbackIntent(message: string, deterministicFilters: ChatFilters) {
  const lower = message.toLowerCase();
  if (lower.includes("low stock") || lower.includes("below")) {
    return {
      action: "count_low_stock" as ChatAction,
      filters: compactFilters({
        ...deterministicFilters,
        lowStockOnly: true,
        status: "low_stock",
      }),
      limit: 25,
    } satisfies ChatIntent;
  }
  return {
    action: "list_items" as ChatAction,
    filters: deterministicFilters,
    limit: 25,
  } satisfies ChatIntent;
}

function summarize(action: string, rows: ChatRow[]) {
  if (action === "count_low_stock") {
    return `I found ${rows.length} low-stock item(s).`;
  }
  if (action === "group_by_category") {
    return "Here is the grouped category summary.";
  }
  if (action === "group_by_supplier") {
    return "Here is the grouped supplier summary.";
  }
  return `I found ${rows.length} matching item(s).`;
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["admin", "manager", "viewer"]);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsedRequest = chatDataRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: categories } = await supabase.from("categories").select("id,name");

  const deterministicFilters = extractDeterministicFilters(
    parsedRequest.data.message,
  );
  let intent: ChatIntent = fallbackIntent(
    parsedRequest.data.message,
    deterministicFilters,
  );
  try {
    const aiResult = await getStructuredAiJson<IntentJson>(
      [
        "You convert inventory chat requests to safe query intent.",
        "Return strict JSON object with key intent only.",
        "Allowed actions: list_items, count_low_stock, group_by_category, group_by_supplier.",
        "Allowed filter keys: q, category, status, maxQuantity, location, supplier, lowStockOnly, sortBy, sortDir.",
        "Never output SQL or markdown.",
      ].join(" "),
      JSON.stringify(
        {
          message: parsedRequest.data.message,
          availableCategories: (categories ?? []).map((c) => c.name),
        },
        null,
        2,
      ),
    );

    const parsedIntent = chatDataIntentSchema.safeParse(aiResult.intent);
    if (parsedIntent.success) {
      intent = {
        action: parsedIntent.data.action as ChatAction,
        filters: compactFilters({
          ...((parsedIntent.data.filters ?? {}) as ChatFilters),
          ...deterministicFilters,
        }),
        limit: parsedIntent.data.limit ?? 25,
      };
    }
  } catch {
    // Fall back to deterministic intent.
  }

  const filters = intent.filters ?? {};
  const limit = Math.min(intent.limit ?? 25, 100);
  const categoryFilter = filters.category?.toLowerCase();
  const categoryId =
    categoryFilter && categories
      ? categories.find(
          (c) => c.name.toLowerCase() === categoryFilter,
        )?.id
      : undefined;

  let query = supabase.from("inventory_items").select(
    "name,quantity,status,supplier,location,category,updated_at",
  );

  if (filters.q) query = query.ilike("name", `%${filters.q}%`);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.location) query = query.ilike("location", `%${filters.location}%`);
  if (filters.supplier) query = query.ilike("supplier", `%${filters.supplier}%`);
  if (filters.maxQuantity !== undefined) {
    query = query.lte("quantity", filters.maxQuantity);
  }
  if (filters.lowStockOnly) query = query.eq("status", "low_stock");
  if (categoryId) query = query.eq("category_id", categoryId);

  const sortBy = filters.sortBy ?? "updated_at";
  const sortDir = filters.sortDir ?? "desc";
  query = query.order(sortBy, { ascending: sortDir === "asc" }).limit(limit);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as ChatRow[];

  if (intent.action === "group_by_category") {
    const grouped = Object.values(
      rows.reduce<Record<string, { category: string; item_count: number }>>(
        (acc, row) => {
          const key = row.category || "Uncategorized";
          if (!acc[key]) acc[key] = { category: key, item_count: 0 };
          acc[key].item_count += 1;
          return acc;
        },
        {},
      ),
    );
    return NextResponse.json({
      answer: `Found ${grouped.length} category group(s).`,
      action: intent.action,
      rows: grouped,
      appliedFilters: filters,
    });
  }

  if (intent.action === "group_by_supplier") {
    const grouped = Object.values(
      rows.reduce<Record<string, { supplier: string; item_count: number }>>(
        (acc, row) => {
          const key = row.supplier || "Unknown Supplier";
          if (!acc[key]) acc[key] = { supplier: key, item_count: 0 };
          acc[key].item_count += 1;
          return acc;
        },
        {},
      ),
    );
    return NextResponse.json({
      answer: `Found ${grouped.length} supplier group(s).`,
      action: intent.action,
      rows: grouped,
      appliedFilters: filters,
    });
  }

  return NextResponse.json({
    answer: summarize(intent.action, rows),
    action: intent.action,
    rows,
    appliedFilters: filters,
  });
}
