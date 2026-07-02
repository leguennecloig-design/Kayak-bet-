import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";

// POST /api/admin/inscriptions/confirm-match
// Body: { competitionId: string, ffckCode: number }
// Fixe manuellement le matching FFCK d'une compétition.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const { competitionId, ffckCode } = body as { competitionId?: string; ffckCode?: number };

  if (!competitionId || !ffckCode) {
    return NextResponse.json({ error: "competitionId et ffckCode requis" }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from("competitions")
    .update({
      ffck_inscription_code: ffckCode,
      ffck_match_status: "matche_manuel",
    })
    .eq("id", competitionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, ffckCode });
}
