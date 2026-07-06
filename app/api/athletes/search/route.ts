import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";
import { stringSimilarity } from "@/lib/matching/fuzzy";

// GET /api/athletes/search?q=
// Auth requise. Recherche floue sur nom/prénom, renvoie le top 10 classé
// par similarité. Ne renvoie jamais linked_user_id brut (juste `claimed`).
export async function GET(req: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json([]);

  const adminSb = createAdminSupabase();
  const { data, error } = await adminSb
    .from("athletes")
    .select("id, nom, prenom, club, categorie, rang_national, saison, linked_user_id")
    .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%`)
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ranked = (data ?? [])
    .map((a) => ({
      id: a.id,
      nom: a.nom,
      prenom: a.prenom,
      club: a.club,
      categorie: a.categorie,
      rangNational: a.rang_national,
      saison: a.saison,
      claimed: a.linked_user_id != null,
      score: stringSimilarity(q, `${a.prenom ?? ""} ${a.nom ?? ""}`),
    }))
    .sort((x, y) => y.score - x.score)
    .slice(0, 10);

  return NextResponse.json(ranked);
}
