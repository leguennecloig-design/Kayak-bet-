import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { fetchInscriptionsList } from "@/lib/scrapers/ffck-inscriptions";

// POST /api/admin/inscriptions/scan
// Scrape la liste FFCK Descente et retourne chaque compétition avec son statut
// d'import (nb partants déjà en base, competition_id si déjà créée).
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  let ffckList;
  try {
    ffckList = await fetchInscriptionsList();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json(
      { error: `Impossible de contacter le site FFCK : ${msg}` },
      { status: 502 }
    );
  }

  if (ffckList.length === 0) {
    return NextResponse.json({ competitions: [] });
  }

  const supabase = createAdminSupabase();

  // Compétitions déjà créées via un import précédent (ont ffck_inscription_code)
  const ffckCodes = ffckList.map(c => c.ffckCode);
  const { data: existing } = await supabase
    .from("competitions")
    .select("id, ffck_inscription_code")
    .in("ffck_inscription_code", ffckCodes);

  const existingMap = new Map<number, string>();
  for (const e of existing ?? []) {
    existingMap.set(e.ffck_inscription_code as number, e.id as string);
  }

  // Nb partants déjà importés par compétition
  const existingIds = [...existingMap.values()];
  const { data: countRows } = existingIds.length
    ? await supabase
        .from("inscriptions")
        .select("competition_id")
        .in("competition_id", existingIds)
    : { data: [] };

  const partantsCount = new Map<string, number>();
  for (const r of countRows ?? []) {
    const k = r.competition_id as string;
    partantsCount.set(k, (partantsCount.get(k) ?? 0) + 1);
  }

  const competitions = ffckList.map(c => {
    const compId = existingMap.get(c.ffckCode) ?? null;
    return {
      ffckCode:     c.ffckCode,
      nom:          c.nom,
      ville:        c.ville,
      dateDebut:    c.dateDebut,
      dateFin:      c.dateFin,
      niveau:       c.niveau,
      competition_id: compId,
      nb_partants:  compId ? (partantsCount.get(compId) ?? 0) : 0,
    };
  });

  return NextResponse.json({ competitions });
}
