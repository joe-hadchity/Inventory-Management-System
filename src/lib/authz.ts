import { NextResponse } from "next/server";
import type { UserRole } from "@/types/inventory";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentProfile() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function requireRole(roles: UserRole[]) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!roles.includes(profile.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true as const, profile };
}
