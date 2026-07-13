import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { deriveExactMarketsFromCoteTop1 } from "@/lib/algo/bradley-terry";

type ImportedAthlete = {
  dossard: number;
  nom: string;
  club: string;
  cote_top1: number | null;
  cote_top3: number | null;
  cote_top5: number | null;
  cote_top10: number | null;
};

type ImportedCategory = {
  code: string;
  libelle: string;
  athletes: ImportedAthlete[];
};

type ImportBody = {
  nom_competition: string;
  lieu: string;
  date_debut: string | null;
  date_fin: string | null;
  categories: ImportedCategory[];
  paris_ouverts_a?: string | null;
};

// POST /api/admin/import-cotes-file — crée une compétition à partir d'un
// fichier de cotes déjà calculées en externe (voir lib/algo/external-cotes-parser.ts).
// Contrairement aux autres flux de création, AUCUN calcul d'algo n'est fait
// ici : les cotes du fichier sont enregistrées telles quelles.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  let body: ImportBody;
  try {
    body = (await req.json()) as ImportBody;
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const nom = body.nom_competition?.trim();
  if (!nom) {
    return NextResponse.json({ error: "Le nom de la compétition est requis" }, { status: 400 });
  }
  const categories = (body.categories ?? []).filter(c => c.athletes?.length > 0);
  if (categories.length === 0) {
    return NextResponse.json({ error: "Aucun participant à importer" }, { status: 400 });
  }

  const supabase = createAdminSupabase();

  // 1. Créer la compétition (paris). Pas d'algo_type : les cotes viennent du
  // fichier, pas du moteur Bradley-Terry — recalculer via /algo écraserait
  // ces valeurs, ce qui reste un choix explicite de l'admin plus tard.
  const { data: comp, error: compErr } = await supabase
    .from("competitions")
    .insert({
      nom,
      date:       body.date_debut || null,
      lieu:       body.lieu?.trim() || null,
      discipline: "Descente",
      status:     "draft",
      algo_type:  null,
      paris_ouverts_a: body.paris_ouverts_a || null,
    })
    .select("id")
    .single();

  if (compErr || !comp) {
    return NextResponse.json({ error: compErr?.message ?? "Erreur création compétition" }, { status: 500 });
  }
  const competitionId = comp.id as string;

  // 2. Construire les lignes participants + cotes à partir du fichier
  const participantRows: {
    competition_id: string; nom: string; pays: string | null;
    cote: number | null; categorie: string; code_bateau: string;
  }[] = [];
  const coteRows: Record<string, unknown>[] = [];

  for (const cat of categories) {
    for (const a of cat.athletes) {
      const codeBateau = `${cat.code}-${a.dossard}`;
      participantRows.push({
        competition_id: competitionId,
        nom:            a.nom,
        pays:           a.club || null,
        cote:           a.cote_top1,
        categorie:      cat.code,
        code_bateau:    codeBateau,
      });
      // Place exacte / temps exact ont besoin de rang_espere + sigma, absents
      // du fichier externe (qui ne fournit que Top1/3/5/10) — dérivés depuis
      // cote_top1 seule pour que ces marchés restent utilisables.
      const derived = a.cote_top1 && a.cote_top1 > 1
        ? deriveExactMarketsFromCoteTop1(a.cote_top1, cat.athletes.length)
        : null;

      coteRows.push({
        competition_id:        competitionId,
        code_bateau:           codeBateau,
        nom:                   a.nom,
        categorie:             cat.code,
        nb_athletes_startlist: cat.athletes.length,
        cote_top1:             a.cote_top1,
        cote_top3:             a.cote_top3,
        cote_top5:             a.cote_top5,
        cote_top10:            a.cote_top10,
        rang_espere:            derived?.rang_espere ?? null,
        sigma:                  derived?.sigma ?? null,
        cote_exact_place:       derived?.cote_exact_place ?? null,
        cote_exact_time:        derived?.cote_exact_time ?? null,
        cote_exact_time_second: derived?.cote_exact_time_second ?? null,
        fallback_type:         "national_only",
        sources_utilisees:     "IMPORT_TXT",
        algo_version:          "import_txt_v1",
        calculated_at:         new Date().toISOString(),
      });
    }
  }

  const { error: participantsErr } = await supabase.from("participants").insert(participantRows);
  if (participantsErr) {
    return NextResponse.json(
      { error: `Compétition créée mais échec import participants : ${participantsErr.message}`, competition_id: competitionId },
      { status: 500 }
    );
  }

  const { error: cotesErr } = await supabase.from("cotes").insert(coteRows);
  if (cotesErr) {
    return NextResponse.json(
      { error: `Compétition créée mais échec import cotes : ${cotesErr.message}`, competition_id: competitionId },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    competition_id: competitionId,
    participants_created: participantRows.length,
    categories: categories.length,
  });
}
