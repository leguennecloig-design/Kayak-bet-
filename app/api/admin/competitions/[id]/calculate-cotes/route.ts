import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import {
  calculateCotesFromInscriptions,
  saveCotesForCompetition,
} from "@/lib/algo/cotes-engine";

type InscriptionRow = {
  code_bateau: string;
  nom: string;
  athlete_id: string | null;
  epreuve: string | null;
  club: string | null;
};

// POST /api/admin/competitions/[id]/calculate-cotes
// Groupe les inscriptions par epreuve en mémoire (pas de re-query),
// lance Bradley-Terry v3 par catégorie, sauvegarde cotes + participants.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const competitionId = params.id;
  const supabase = createAdminSupabase();

  // Discipline (sprint vs descente pour l'historique)
  const { data: comp } = await supabase
    .from("competitions")
    .select("discipline")
    .eq("id", competitionId)
    .single();

  const disciplineEstSprint =
    comp?.discipline?.toLowerCase().includes("sprint") ?? false;

  // Récupère TOUTES les inscriptions en une seule requête
  const { data: rawInscs, error: inscErr } = await supabase
    .from("inscriptions")
    .select("code_bateau, nom, athlete_id, epreuve, club")
    .eq("competition_id", competitionId);

  if (inscErr) {
    return NextResponse.json({ error: inscErr.message }, { status: 500 });
  }

  if (!rawInscs || rawInscs.length === 0) {
    return NextResponse.json(
      { error: "Aucune inscription trouvée pour cette compétition. Importe d'abord les partants." },
      { status: 422 }
    );
  }

  const inscriptions = rawInscs as InscriptionRow[];

  // Groupe par epreuve en mémoire — élimine les problèmes de matching DB
  const byEpreuve = new Map<string, InscriptionRow[]>();
  const clubMap   = new Map<string, string | null>();

  for (const row of inscriptions) {
    const key = (row.epreuve ?? "INCONNU").trim();
    const grp = byEpreuve.get(key) ?? [];
    grp.push(row);
    byEpreuve.set(key, grp);
    clubMap.set(row.code_bateau, row.club);
  }

  // Vérifie qu'on a au moins un epreuve renseigné
  const hasEpreuve = [...byEpreuve.keys()].some(k => k !== "INCONNU");
  if (!hasEpreuve) {
    return NextResponse.json(
      { error: "Les partants n'ont pas d'épreuve renseignée. Réimporte les partants depuis la page Inscriptions (bouton 'Réimporter')." },
      { status: 422 }
    );
  }

  const allCotes: Awaited<ReturnType<typeof calculateCotesFromInscriptions>> = [];
  const summary:  Record<string, number> = {};
  const errors:   string[] = [];

  for (const [epreuve, entries] of byEpreuve) {
    if (epreuve === "INCONNU") continue;
    if (entries.length < 2) continue; // pas assez d'athlètes pour une cote relative

    try {
      const cotes = await calculateCotesFromInscriptions(
        entries.map(e => ({ code_bateau: e.code_bateau, nom: e.nom, athlete_id: e.athlete_id })),
        epreuve,
        disciplineEstSprint,
        supabase
      );

      if (cotes.length > 0) {
        await saveCotesForCompetition(competitionId, cotes, supabase);
        allCotes.push(...cotes);
        summary[epreuve] = cotes.length;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${epreuve}: ${msg}`);
      console.error(`Erreur catégorie ${epreuve}:`, err);
    }
  }

  if (allCotes.length === 0) {
    const epreuvesList = [...byEpreuve.entries()]
      .filter(([k]) => k !== "INCONNU")
      .map(([k, v]) => `${k}(${v.length})`)
      .join(", ");

    return NextResponse.json(
      {
        error: `Aucune cote générée. Catégories trouvées : [${epreuvesList}]. ` +
          (errors.length > 0 ? `Erreurs : ${errors.join(" | ")}` : "Toutes les catégories ont moins de 2 athlètes."),
      },
      { status: 422 }
    );
  }

  // Synchronise les participants : supprime les anciens, insère depuis les cotes
  await supabase.from("participants").delete().eq("competition_id", competitionId);

  const participantRows = allCotes.map(c => ({
    competition_id: competitionId,
    nom:  c.nom,
    pays: clubMap.get(c.code_bateau) ?? null,
    cote: c.cote_top1,
  }));

  const { error: insertErr } = await supabase
    .from("participants")
    .insert(participantRows);

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    total_cotes:          allCotes.length,
    participants_created: participantRows.length,
    categories:           summary,
    ...(errors.length > 0 ? { warnings: errors } : {}),
  });
}
