import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

// GET /api/competitions/[id]/cotes?categorie=K1HM
// Route publique (client anon, RLS applique le filtre "published" seule).
// Renvoie les cotes complètes (tous types de pari) d'une compétition publiée.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const competitionId = params.id;
  const categorie = req.nextUrl.searchParams.get("categorie");
  const supabase = createServerSupabase();

  const { data: comp } = await supabase
    .from("competitions")
    .select("id, status, paris_ouverts_a")
    .eq("id", competitionId)
    .eq("status", "published")
    .maybeSingle();

  if (!comp) {
    return NextResponse.json({ error: "Compétition introuvable" }, { status: 404 });
  }

  if (comp.paris_ouverts_a && new Date(comp.paris_ouverts_a).getTime() > Date.now()) {
    return NextResponse.json(
      { error: "Les paris ne sont pas encore ouverts", locked: true, opensAt: comp.paris_ouverts_a },
      { status: 403 }
    );
  }

  // rang_espere + sigma sont exposés pour permettre le calcul DYNAMIQUE de la
  // cote "place exacte" côté client selon la place choisie (revalidé serveur).
  let query = supabase
    .from("cotes")
    .select(
      "code_bateau, athlete_id, nom, categorie, rang_espere, sigma, prob_top1, cote_top1, cote_top3, cote_top5, cote_top10, cote_top20, cote_exact_place, cote_exact_time, cote_exact_time_second"
    )
    .eq("competition_id", competitionId);

  if (categorie) {
    query = query.eq("categorie", categorie);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
