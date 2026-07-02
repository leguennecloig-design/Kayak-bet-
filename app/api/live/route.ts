import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-server";

export const revalidate = 0;

/**
 * GET /api/live
 *
 * Retourne les résultats live des 6 dernières heures,
 * groupés par compétition → épreuve → athlètes.
 * Public — pas d'authentification requise.
 */
export async function GET() {
  const supabase = createAdminSupabase();

  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("live_resultats")
    .select(
      "competition_key, competition_nom, competition_ville, code_activite," +
      "epreuve, etat_epreuve, rang, dossard, nom, club, code_nation," +
      "temps_display, synced_at"
    )
    .gte("synced_at", since)
    .order("competition_key")
    .order("epreuve")
    .order("rang", { nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Groupement : competition_key → epreuves → athletes
  type AthleteRow = {
    rang: number | null;
    dossard: number;
    nom: string;
    club: string;
    code_nation: string;
    temps_display: string;
  };
  type EpreuveGroup = { etat: number; athletes: AthleteRow[] };
  type CompGroup = {
    key: string;
    nom: string;
    ville: string;
    code_activite: string;
    epreuves: Record<string, EpreuveGroup>;
    synced_at: string;
  };

  const grouped: Record<string, CompGroup> = {};

  for (const row of (data ?? []) as any[]) {
    if (!grouped[row.competition_key]) {
      grouped[row.competition_key] = {
        key:           row.competition_key,
        nom:           row.competition_nom   ?? "",
        ville:         row.competition_ville ?? "",
        code_activite: row.code_activite     ?? "",
        epreuves:      {},
        synced_at:     row.synced_at         ?? "",
      };
    }
    const comp = grouped[row.competition_key];
    if (!comp.epreuves[row.epreuve]) {
      comp.epreuves[row.epreuve] = { etat: row.etat_epreuve ?? 3, athletes: [] };
    }
    comp.epreuves[row.epreuve].athletes.push({
      rang:          row.rang,
      dossard:       row.dossard,
      nom:           row.nom,
      club:          row.club            ?? "",
      code_nation:   row.code_nation     ?? "",
      temps_display: row.temps_display   ?? "—",
    });

    if (row.synced_at > comp.synced_at) comp.synced_at = row.synced_at;
  }

  return NextResponse.json(Object.values(grouped));
}
