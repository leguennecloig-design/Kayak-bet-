import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";

// GET /api/admin/inscriptions/list/[competitionId]
// Retourne la liste des partants stockés pour une compétition.
export async function GET(
  _req: NextRequest,
  { params }: { params: { competitionId: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("inscriptions")
    .select("id, code_bateau, nom, sexe, club, numero_club, licence_valide, pagaie_couleur, athlete_id")
    .eq("competition_id", params.competitionId)
    .order("nom", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}
