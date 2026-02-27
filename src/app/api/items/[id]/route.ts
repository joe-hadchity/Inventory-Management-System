import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { itemPatchSchema } from "@/lib/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ItemWithCategory = {
  category: string;
  categories?: { name: string } | null;
  [key: string]: unknown;
};

function deriveStatus(quantity: number, threshold?: number | null) {
  if (threshold !== null && threshold !== undefined && quantity <= threshold) {
    return "low_stock";
  }
  return "in_stock";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["admin", "manager", "viewer"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*, categories(name)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  const item = data as ItemWithCategory;
  return NextResponse.json({
    data: {
      ...item,
      category: item.categories?.name ?? item.category,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["admin", "manager"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const payload = await request.json();
  const parsed = itemPatchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: existing, error: fetchError } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError || !existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (existing.status === "discontinued" && parsed.data.status === "ordered") {
    return NextResponse.json(
      { error: "Cannot order a discontinued item." },
      { status: 400 },
    );
  }

  const nextQuantity = parsed.data.quantity ?? existing.quantity;
  const nextThreshold =
    parsed.data.reorder_threshold ?? existing.reorder_threshold ?? null;
  const statusFromRules = deriveStatus(nextQuantity, nextThreshold);
  const finalStatus =
    parsed.data.status === "ordered" || parsed.data.status === "discontinued"
      ? parsed.data.status
      : statusFromRules;

  let categoryPatch: { category_id?: string; category?: string } = {};
  if (parsed.data.categoryId) {
    const { data: categoryRecord, error: categoryError } = await supabase
      .from("categories")
      .select("id,name")
      .eq("id", parsed.data.categoryId)
      .single();
    if (categoryError || !categoryRecord) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    categoryPatch = {
      category_id: categoryRecord.id,
      category: categoryRecord.name,
    };
  }

  const restPatch = Object.fromEntries(
    Object.entries(parsed.data).filter(([key]) => key !== "categoryId"),
  );

  const { data, error } = await supabase
    .from("inventory_items")
    .update({
      ...restPatch,
      ...categoryPatch,
      status: finalStatus,
      updated_by: auth.profile.id,
      last_updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("inventory_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
