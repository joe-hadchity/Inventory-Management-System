import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import {
  itemInputSchema,
  listQuerySchema,
  statusEnum,
} from "@/lib/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ItemWithCategory = {
  category: string;
  categories?: { name: string } | null;
  [key: string]: unknown;
};

function deriveStatus(quantity: number, threshold?: number | null) {
  if (threshold !== null && threshold !== undefined && quantity <= threshold) {
    return "low_stock" as const;
  }
  return "in_stock" as const;
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(["admin", "manager", "viewer"]);
  if (!auth.ok) return auth.response;

  const supabase = await createServerSupabaseClient();
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = listQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query params" }, { status: 400 });
  }

  const {
    q,
    categoryId,
    status,
    sku,
    location,
    supplier,
    maxQuantity,
    lowStockOnly,
    sortBy,
    sortDir,
  } =
    parsed.data;

  let query = supabase
    .from("inventory_items")
    .select("*, categories(name)")
    .order(sortBy, { ascending: sortDir === "asc" });
  if (q) query = query.ilike("name", `%${q}%`);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (status) query = query.eq("status", status);
  if (sku) query = query.ilike("sku", `%${sku}%`);
  if (location) query = query.ilike("location", `%${location}%`);
  if (supplier) query = query.ilike("supplier", `%${supplier}%`);
  if (maxQuantity !== undefined && !Number.isNaN(maxQuantity)) {
    query = query.lte("quantity", maxQuantity);
  }
  if (lowStockOnly) query = query.eq("status", "low_stock");

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const normalized = ((data ?? []) as ItemWithCategory[]).map((item) => ({
    ...item,
    category: item.categories?.name ?? item.category,
  }));
  return NextResponse.json({ data: normalized });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["admin", "manager"]);
  if (!auth.ok) return auth.response;

  const supabase = await createServerSupabaseClient();
  const payload = await request.json();
  const parsed = itemInputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const { categoryId, ...restBody } = body;

  if (body.status === "discontinued" && body.quantity > 0) {
    return NextResponse.json(
      { error: "Discontinued items should have quantity 0." },
      { status: 400 },
    );
  }

  const normalizedStatus =
    body.status === "ordered" || body.status === "discontinued"
      ? body.status
      : deriveStatus(body.quantity, body.reorder_threshold);

  statusEnum.parse(normalizedStatus);

  const { data: categoryRecord, error: categoryError } = await supabase
    .from("categories")
    .select("id,name")
    .eq("id", categoryId)
    .single();

  if (categoryError || !categoryRecord) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      ...restBody,
      category_id: categoryRecord.id,
      category: categoryRecord.name,
      status: normalizedStatus,
      updated_by: auth.profile.id,
      last_updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
