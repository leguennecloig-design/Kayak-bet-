import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";

type ImportedQualifAthlete = {
  dossard: number;
  nom: string;
  club: string;
  cote_qualif_finale: number | null;
};

type ImportedQualifCategory = {
  code: string;
  libelle: string;
  nb_partants: number;
  nb_qualifies: number;
  athletes: ImportedQualifAthlete[];
};

type ImportBody = {
  nom_competition: string;
  lieu: string;
  date_debut: string | null;
  date_fin: string | null;
  categories: ImportedQualifCategory[];
  paris_ouverts_a?: string | null;
};

// POST /api/admin/import-cotes-qualif-file — crée une compétition QUALIF
// (marche_qualif_finale=true) à partir d'un fichier de cotes "passage en
// finale" déjà calculées en externe (voir external-cotes-parser-qualif.ts).
// Un seul marché existe pour ce type de compétition : aucune ligne n'est
// créée dans `cotes` (Top1/3/5/10/place/temps exact n'existent pas ici) —
// la cote de qualification est stockée directement sur participants.cote,
// exactement comme la cote "Vainqueur" pour une compétition normale.
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

  const { data: comp, error: compErr } = await supabase
    .from("competitions")
    .insert({
      nom,
      date:       body.date_debut || null,
      lieu:       body.lieu?.trim() || null,
      discipline: "Sprint",
      status:     "draft",
      algo_type:  null,
      marche_qualif_finale: true,
      paris_ouverts_a: body.paris_ouverts_a || null,
    })
    .select("id")
    .single();

  if (compErr || !comp) {
    return NextResponse.json({ error: compErr?.message ?? "Erreur création compétition" }, { status: 500 });
  }
  const competitionId = comp.id as string;

  const participantRows: {
    competition_id: string; nom: string; pays: string | null;
    cote: number | null; categorie: string; code_bateau: string; qualifies_finale: number;
  }[] = [];

  for (const cat of categories) {
    for (const a of cat.athletes) {
      participantRows.push({
        competition_id:   competitionId,
        nom:              a.nom,
        pays:             a.club || null,
        cote:             a.cote_qualif_finale,
        categorie:        cat.code,
        code_bateau:      `${cat.code}-${a.dossard}`,
        qualifies_finale: cat.nb_qualifies,
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

  return NextResponse.json({
    ok: true,
    competition_id: competitionId,
    participants_created: participantRows.length,
    categories: categories.length,
  });
}
