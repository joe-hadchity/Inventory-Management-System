import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return auth.response;

  const payload = await request.json();
  const parsed = categorySchema.partial().safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .update({
      name: parsed.data.name?.trim(),
      description: parsed.data.description,
    })
    .eq("id", id)
    .select("id,name,description")
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

  const { count, error: usageError } = await supabase
    .from("inventory_items")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id);

  if (usageError) {
    return NextResponse.json({ error: usageError.message }, { status: 500 });
  }
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Category is linked to items and cannot be deleted." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
