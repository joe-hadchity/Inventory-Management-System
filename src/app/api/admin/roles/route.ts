import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { roleUpdateSchema } from "@/lib/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return auth.response;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role")
    .order("email");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return auth.response;

  const payload = await request.json();
  const parsed = roleUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
