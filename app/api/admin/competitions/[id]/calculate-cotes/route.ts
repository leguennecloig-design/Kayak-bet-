import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import {
  calculateCotesFromInscriptions,
  saveCotesForCompetition,
} from "@/lib/algo/cotes-engine";
import { parseResultatsPDF } from "@/lib/parsers/resultats-pdf";
import { matchPriorRoundToCodeBateau } from "@/lib/algo/match-prior-round";
import { combineSprintFinale } from "@/lib/algo/sprint-finale-engine";
import { combineMassStart } from "@/lib/algo/mass-start-engine";
// pdf-parse is a CommonJS module — must import with require at call site

type InscriptionRow = {
  code_bateau: string;
  nom: string;
  athlete_id: string | null;
  epreuve: string | null;
  club: string | null;
};

const SPECIAL_FORMATS = new Set(["mass_start", "sprint_finale"]);

// POST /api/admin/competitions/[id]/calculate-cotes
// Groupe les inscriptions par epreuve en mémoire (pas de re-query),
// lance Bradley-Terry v3 par catégorie, sauvegarde cotes + participants.
// Pour mass_start / sprint_finale : accepte en plus un fichier de résultats
// (PDF/TXT, même format que l'import de résultats) de la manche précédente
// (classique pour mass_start, sprint normal pour sprint_finale), qui vient
// pondérer le score v3 (cf. lib/algo/{mass-start,sprint-finale}-engine.ts).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const competitionId = params.id;
  const supabase = createAdminSupabase();

  // ── Algo choisi à la création (v4) + fichier de résultats éventuel ──────
  // Source de vérité : `algo_type` sur la compétition. On accepte un override
  // `algo_type` dans le FormData (sélection admin pas encore enregistrée) qui
  // gagne, sinon la valeur en base, sinon repli sur `race_type`/`discipline`.
  const { data: comp } = await supabase
    .from("competitions")
    .select("discipline, algo_type")
    .eq("id", competitionId)
    .single();

  let priorRoundResults: ReturnType<typeof parseResultatsPDF> = [];
  let formAlgoOverride: string | null = null;
  let formRaceType: string | null = null;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    formAlgoOverride = (formData.get("algo_type") as string | null) || null;
    formRaceType     = (formData.get("race_type") as string | null) || null;
    const file = formData.get("file") as File | null;

    if (file) {
      const fileName = file.name.toLowerCase();
      let rawText = "";
      if (fileName.endsWith(".txt")) {
        rawText = await file.text();
      } else {
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const pdfParse = require("pdf-parse");
          const pdfData = await pdfParse(buffer);
          rawText = pdfData.text as string;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return NextResponse.json({ error: `Erreur lecture PDF : ${msg}` }, { status: 422 });
        }
      }
      priorRoundResults = parseResultatsPDF(rawText);
      if (priorRoundResults.length === 0) {
        return NextResponse.json(
          { error: "Aucun résultat détecté dans le fichier de la manche précédente." },
          { status: 422 }
        );
      }
    }
  }

  // Algo effectif : override formulaire > base > repli. Map algo → format + sprint :
  //   classique → standard/descente · sprint → standard/sprint
  //   mass_start → mass_start/descente · sprint_finale → sprint_finale/sprint
  const algoType = (formAlgoOverride || (comp?.algo_type as string | null) || null);
  function raceTypeFromAlgo(a: string): string {
    return (a === "mass_start" || a === "sprint_finale") ? a : "standard";
  }
  const raceType = algoType
    ? raceTypeFromAlgo(algoType)
    : (formRaceType ?? "standard");
  const disciplineEstSprint = algoType
    ? (algoType === "sprint" || algoType === "sprint_finale")
    : (comp?.discipline?.toLowerCase().includes("sprint") ?? false);

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
  const formatToSave: "standard" | "sprint_finale" | "mass_start" =
    raceType === "sprint_finale" || raceType === "mass_start" ? raceType : "standard";

  for (const [epreuve, entries] of byEpreuve) {
    if (epreuve === "INCONNU") continue;
    if (entries.length < 2) continue; // pas assez d'athlètes pour une cote relative

    try {
      let cotes = await calculateCotesFromInscriptions(
        entries.map(e => ({ code_bateau: e.code_bateau, nom: e.nom, athlete_id: e.athlete_id })),
        epreuve,
        disciplineEstSprint,
        supabase
      );

      if (cotes.length > 0 && SPECIAL_FORMATS.has(raceType) && priorRoundResults.length > 0) {
        const synthetic = matchPriorRoundToCodeBateau(cotes, priorRoundResults);
        cotes = raceType === "sprint_finale"
          ? combineSprintFinale(cotes, synthetic, epreuve)
          : combineMassStart(cotes, synthetic, epreuve);
      }

      if (cotes.length > 0) {
        const stamped = cotes.map(c => ({ ...c, format_course: formatToSave }));
        await saveCotesForCompetition(competitionId, stamped, supabase);
        allCotes.push(...stamped);
        summary[epreuve] = stamped.length;
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
    nom:         c.nom,
    pays:        clubMap.get(c.code_bateau) ?? null,
    cote:        c.cote_top1,
    categorie:   c.categorie,
    code_bateau: c.code_bateau,
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
    format_course:        formatToSave,
    ...(errors.length > 0 ? { warnings: errors } : {}),
  });
}
