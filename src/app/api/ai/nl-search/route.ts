import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import {
  nlSearchResponseSchema,
  nlSearchSchema,
  listQuerySchema,
} from "@/lib/validation";
import { getStructuredAiJson } from "@/lib/ai";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type NlSearchJson = { filters: unknown };

export async function POST(request: NextRequest) {
  const auth = await requireRole(["admin", "manager", "viewer"]);
  if (!auth.ok) return auth.response;

  const payload = await request.json();
  const parsedInput = nlSearchSchema.safeParse(payload);
  if (!parsedInput.success) {
    return NextResponse.json({ error: "Invalid search query" }, { status: 400 });
  }

  try {
    const aiOutput = await getStructuredAiJson<NlSearchJson>(
      [
        "You convert natural language into inventory filters.",
        "Return JSON object with key filters only.",
        "Allowed keys: q, category, status, maxQuantity, location, supplier, sortBy, sortDir.",
        "No extra keys.",
      ].join(" "),
      parsedInput.data.query,
    );

    const sanitized = nlSearchResponseSchema.safeParse(aiOutput.filters);
    if (!sanitized.success) {
      return NextResponse.json({ filters: {}, source: "fallback" });
    }

    const supabase = await createServerSupabaseClient();
    let categoryId: string | undefined;
    if (sanitized.data.category) {
      const { data: categoryMatch } = await supabase
        .from("categories")
        .select("id")
        .ilike("name", sanitized.data.category)
        .maybeSingle();
      categoryId = categoryMatch?.id;
    }

    const candidateFilters = {
      q: sanitized.data.q,
      categoryId,
      status: sanitized.data.status,
      maxQuantity: sanitized.data.maxQuantity?.toString(),
      location: sanitized.data.location,
      supplier: sanitized.data.supplier,
      sortBy: sanitized.data.sortBy,
      sortDir: sanitized.data.sortDir,
    };

    const finalFilters = listQuerySchema.safeParse(candidateFilters).success
      ? candidateFilters
      : {};

    return NextResponse.json({ filters: finalFilters, source: "ai" });
  } catch {
    return NextResponse.json({ filters: {}, source: "fallback" });
  }
}
