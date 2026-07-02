import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import {
  calculateCotesFromInscriptions,
  saveCotesForCompetition,
} from "@/lib/algo/cotes-engine";

// POST /api/admin/competitions/[id]/calculate-cotes
// 1. Regroupe les inscriptions par epreuve (catégorie)
// 2. Lance l'algo Bradley-Terry par catégorie
// 3. Sauvegarde les cotes dans la table `cotes`
// 4. Synchronise la table `participants` (nom + cote_top1)
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const competitionId = params.id;
  const supabase = createAdminSupabase();

  // Récupère la discipline pour détecter sprint vs descente
  const { data: comp } = await supabase
    .from("competitions")
    .select("discipline")
    .eq("id", competitionId)
    .single();

  const disciplineEstSprint =
    comp?.discipline?.toLowerCase().includes("sprint") ?? false;

  // Récupère les épreuves distinctes présentes dans les inscriptions
  const { data: epreuvesRaw } = await supabase
    .from("inscriptions")
    .select("epreuve, code_bateau, nom, club")
    .eq("competition_id", competitionId)
    .not("epreuve", "is", null);

  if (!epreuvesRaw || epreuvesRaw.length === 0) {
    return NextResponse.json(
      { error: "Aucune inscription avec épreuve trouvée. Réimporte les partants depuis la page Inscriptions." },
      { status: 422 }
    );
  }

  // Map code_bateau → club pour la synchro participants
  const clubMap = new Map<string, string | null>();
  for (const r of epreuvesRaw) {
    clubMap.set(r.code_bateau as string, r.club as string | null);
  }

  const epreuves = [...new Set(epreuvesRaw.map(r => r.epreuve as string))];

  const allCotes: Awaited<ReturnType<typeof calculateCotesFromInscriptions>> = [];
  const summary: Record<string, number> = {};

  for (const epreuve of epreuves) {
    try {
      const cotes = await calculateCotesFromInscriptions(
        competitionId,
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
      console.error(`Erreur catégorie ${epreuve}:`, err);
    }
  }

  if (allCotes.length === 0) {
    const categoriesVues = epreuves.join(", ");
    return NextResponse.json(
      {
        error: `Aucun athlète connu trouvé dans les catégories [${categoriesVues}]. ` +
          "L'algo n'inclut que les athlètes avec un classement numérique ou des résultats en base. " +
          "Vérifie que la table athletes est synchronisée avec les données FFCK.",
      },
      { status: 422 }
    );
  }

  // Synchronise les participants : supprime les anciens, insère depuis les cotes
  await supabase
    .from("participants")
    .delete()
    .eq("competition_id", competitionId);

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
  });
}
