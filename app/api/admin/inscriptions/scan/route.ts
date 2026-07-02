import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import {
  fetchInscriptionsList,
  matchCompetitionToFFCK,
  type FFCKCompetitionListItem,
} from "@/lib/scrapers/ffck-inscriptions";
import { sleep } from "@/lib/scrapers/ffck-inscriptions";
import { FFCK_SCRAPER_CONFIG } from "@/lib/scrapers/ffck-config";

type ScanResult = {
  competitionId: string;
  nom: string;
  status: "matche_auto" | "ambigu" | "introuvable";
  ffckCode?: number;
  confidence?: number;
  candidates?: FFCKCompetitionListItem[];
};

// POST /api/admin/inscriptions/scan
// Récupère les compétitions Descente (draft/published, sans ffck_inscription_code),
// scrape la liste FFCK, tente un matching automatique pour chacune.
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const supabase = createAdminSupabase();

  // Compétitions Descente sans code FFCK déjà assigné
  const { data: comps, error: compsError } = await supabase
    .from("competitions")
    .select("id, nom, date, lieu, discipline")
    .in("status", ["draft", "published"])
    .is("ffck_inscription_code", null)
    .or("discipline.ilike.%Descente%,discipline.is.null");

  if (compsError) {
    return NextResponse.json({ error: compsError.message }, { status: 500 });
  }

  if (!comps || comps.length === 0) {
    return NextResponse.json({
      message: "Aucune compétition Descente à matcher.",
      results: [],
      summary: { auto: 0, ambigu: 0, introuvable: 0 },
    });
  }

  // Scrape la liste FFCK une seule fois
  let ffckList: FFCKCompetitionListItem[] = [];
  try {
    ffckList = await fetchInscriptionsList();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json(
      { error: `Impossible de contacter le site FFCK : ${msg}` },
      { status: 502 }
    );
  }

  const results: ScanResult[] = [];
  let autoCount = 0, ambiguCount = 0, introuvableCount = 0;

  for (const comp of comps) {
    await sleep(FFCK_SCRAPER_CONFIG.REQUEST_DELAY_MS);

    const match = matchCompetitionToFFCK(
      { nom: comp.nom, lieu: comp.lieu, date: comp.date },
      ffckList
    );

    const result: ScanResult = {
      competitionId: comp.id,
      nom: comp.nom,
      status: match.status,
    };

    if (match.status === "matche_auto") {
      result.ffckCode    = match.ffckCode;
      result.confidence  = match.confidence;
      autoCount++;
      // Persiste le matching en base
      await supabase
        .from("competitions")
        .update({
          ffck_inscription_code: match.ffckCode,
          ffck_match_status: "matche_auto",
        })
        .eq("id", comp.id);
    } else if (match.status === "ambigu") {
      result.candidates = match.candidates;
      ambiguCount++;
      await supabase
        .from("competitions")
        .update({ ffck_match_status: "ambigu" })
        .eq("id", comp.id);
    } else {
      introuvableCount++;
      await supabase
        .from("competitions")
        .update({ ffck_match_status: "introuvable" })
        .eq("id", comp.id);
    }

    results.push(result);
  }

  return NextResponse.json({
    results,
    summary: { auto: autoCount, ambigu: ambiguCount, introuvable: introuvableCount },
  });
}
