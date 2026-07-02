import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { fetchParticipants } from "@/lib/scrapers/ffck-inscriptions";

// POST /api/admin/inscriptions/fetch/[competitionId]
// Scrape les partants FFCK et les upsert dans la table inscriptions.
// Tente de relier chaque code_bateau à un athlete_id existant.
export async function POST(
  _req: NextRequest,
  { params }: { params: { competitionId: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { competitionId } = params;
  const supabase = createAdminSupabase();

  // Vérifier que la compétition a bien un code FFCK assigné
  const { data: comp, error: compError } = await supabase
    .from("competitions")
    .select("id, nom, ffck_inscription_code")
    .eq("id", competitionId)
    .single();

  if (compError || !comp) {
    return NextResponse.json({ error: "Compétition introuvable" }, { status: 404 });
  }
  if (!comp.ffck_inscription_code) {
    return NextResponse.json(
      { error: "Aucun code FFCK assigné à cette compétition. Effectuez le matching d'abord." },
      { status: 400 }
    );
  }

  // Scrape les partants
  let participants;
  try {
    participants = await fetchParticipants(comp.ffck_inscription_code as number);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json(
      { error: `Impossible de scraper les partants : ${msg}` },
      { status: 502 }
    );
  }

  if (participants.length === 0) {
    return NextResponse.json({ imported: 0, matched: 0, message: "Aucun partant trouvé." });
  }

  // Récupère tous les athletes existants avec leurs code_bateau en une requête
  const codesBateaux = participants
    .map(p => p.codeBateau)
    .filter(c => !c.includes('/')); // exclut les biplaces compound

  const { data: athletesRows } = await supabase
    .from("athletes")
    .select("id, code_bateau")
    .in("code_bateau", codesBateaux);

  const athleteMap = new Map<string, string>();
  for (const a of athletesRows ?? []) {
    athleteMap.set(a.code_bateau as string, a.id as string);
  }

  // Prépare les upserts
  const rows = participants.map(p => ({
    competition_id:  competitionId,
    code_bateau:     p.codeBateau,
    nom:             p.nom,
    sexe:            p.sexe,
    club:            p.club,
    numero_club:     p.numeroClub,
    licence_valide:  p.licenceValide,
    pagaie_couleur:  p.pagaieCouleur,
    athlete_id:      athleteMap.get(p.codeBateau) ?? null,
    scraped_at:      new Date().toISOString(),
  }));

  const { error: upsertError } = await supabase
    .from("inscriptions")
    .upsert(rows, { onConflict: "competition_id,code_bateau" });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  const matchedCount = rows.filter(r => r.athlete_id != null).length;

  return NextResponse.json({
    imported: rows.length,
    matched: matchedCount,
    message: `${rows.length} partants importés, ${matchedCount} liés à un athlète existant.`,
  });
}
