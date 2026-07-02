import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { fetchParticipants } from "@/lib/scrapers/ffck-inscriptions";

// POST /api/admin/inscriptions/import/[ffckCode]
// Importe les partants d'une compétition FFCK.
// Crée automatiquement une entrée dans competitions si elle n'existe pas encore.
export async function POST(
  req: NextRequest,
  { params }: { params: { ffckCode: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const ffckCode = parseInt(params.ffckCode, 10);
  if (isNaN(ffckCode)) {
    return NextResponse.json({ error: "Code FFCK invalide" }, { status: 400 });
  }

  // Infos de la compétition passées dans le body
  const body = await req.json() as {
    nom: string;
    ville: string;
    dateDebut: string;
    dateFin: string;
    niveau: string;
  };

  const supabase = createAdminSupabase();

  // Trouve ou crée une entrée dans competitions
  let competitionId: string;
  const { data: existing } = await supabase
    .from("competitions")
    .select("id")
    .eq("ffck_inscription_code", ffckCode)
    .maybeSingle();

  if (existing?.id) {
    competitionId = existing.id as string;
  } else {
    const { data: created, error: createErr } = await supabase
      .from("competitions")
      .insert({
        nom:                   body.nom,
        date:                  body.dateDebut,
        lieu:                  body.ville.replace(/^\d{5}\s+/, "").trim(),
        discipline:            "Descente",
        ffck_inscription_code: ffckCode,
        ffck_match_status:     "matche_manuel",
      })
      .select("id")
      .single();

    if (createErr || !created) {
      return NextResponse.json(
        { error: createErr?.message ?? "Erreur création compétition" },
        { status: 500 }
      );
    }
    competitionId = created.id as string;
  }

  // Scrape les partants
  let participants;
  try {
    participants = await fetchParticipants(ffckCode);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json(
      { error: `Impossible de scraper les partants : ${msg}` },
      { status: 502 }
    );
  }

  if (participants.length === 0) {
    return NextResponse.json({
      imported: 0, matched: 0,
      competition_id: competitionId,
      message: "Aucun partant trouvé sur le site FFCK.",
    });
  }

  // Résolution athlete_id depuis la table athletes
  const codesBateaux = participants
    .map(p => p.codeBateau)
    .filter(c => /^[KC][12][A-Z]\d+$/.test(c)); // exclut les codes biplaces composés

  const { data: athletesRows } = await supabase
    .from("athletes")
    .select("id, code_bateau")
    .in("code_bateau", codesBateaux);

  const athleteMap = new Map<string, string>();
  for (const a of athletesRows ?? []) {
    athleteMap.set(a.code_bateau as string, a.id as string);
  }

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

  const { error: upsertErr } = await supabase
    .from("inscriptions")
    .upsert(rows, { onConflict: "competition_id,code_bateau" });

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  const matchedCount = rows.filter(r => r.athlete_id != null).length;

  return NextResponse.json({
    imported: rows.length,
    matched:  matchedCount,
    competition_id: competitionId,
    message: `${rows.length} partants importés, ${matchedCount} liés à un athlète.`,
  });
}
