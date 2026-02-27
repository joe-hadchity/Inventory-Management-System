import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireRole(["admin", "manager", "viewer"]);
  if (!auth.ok) return auth.response;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,description")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return auth.response;

  const payload = await request.json();
  const parsed = categorySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: parsed.data.name.trim(),
      description: parsed.data.description ?? null,
      created_by: auth.profile.id,
    })
    .select("id,name,description")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
