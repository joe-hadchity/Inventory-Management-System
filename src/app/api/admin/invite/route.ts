import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import { inviteSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const auth = await requireRole(["admin"]);
  if (!auth.ok) return auth.response;

  const payload = await request.json();
  const parsed = inviteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  const supabase = await createServerSupabaseClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/login`;

  const { data, error } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      redirectTo,
      data: { full_name: parsed.data.fullName ?? "" },
    },
  );

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Invite failed" },
      { status: 500 },
    );
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: data.user.id,
    email: parsed.data.email,
    full_name: parsed.data.fullName ?? null,
    role: parsed.data.role,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId: data.user.id });
}
