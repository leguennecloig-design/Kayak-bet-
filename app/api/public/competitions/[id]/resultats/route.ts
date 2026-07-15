import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-server";

// GET /api/public/competitions/[id]/resultats — classement final par
// catégorie d'une compétition ARCHIVÉE uniquement (voir competitions.archived) ;
// 404 sinon, jamais de fuite des résultats d'une compétition non publiée
// comme telle. Public, pas d'auth requise.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminSupabase();

  const { data: comp } = await supabase
    .from("competitions")
    .select("id, nom, date, lieu, discipline, archived, status")
    .eq("id", params.id)
    .maybeSingle();

  if (!comp || !comp.archived || comp.status !== "closed") {
    return NextResponse.json({ error: "Compétition introuvable" }, { status: 404 });
  }

  const { data: resultats, error } = await supabase
    .from("resultats")
    .select("categorie, rang, nom, club, temps, dns, dnf, dsq")
    .eq("competition_id", params.id)
    .order("categorie", { ascending: true })
    .order("rang", { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byCategorie: Record<string, typeof resultats> = {};
  for (const r of (resultats ?? [])) {
    (byCategorie[r.categorie] ??= []).push(r);
  }

  return NextResponse.json({
    competition: { id: comp.id, nom: comp.nom, date: comp.date, lieu: comp.lieu, discipline: comp.discipline },
    categories: byCategorie,
  });
}
