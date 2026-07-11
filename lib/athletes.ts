import { createAdminSupabase } from "@/lib/supabase-server";

export type Athlete = {
  rang: number;
  nom_prenom: string;
  club: string;
  code_bateau: string;
  points: number;
  nb_courses: number;
};

export const CATEGORY_LABELS: Record<string, string> = {
  C1D:    "Canoë 1 — Dame Senior",
  C1DU15: "Canoë 1 — Dame U15",
  C1DU18: "Canoë 1 — Dame U18",
  C1HM1:  "Canoë 1 — Homme M1",
  C1HM2:  "Canoë 1 — Homme M2",
  C1HM22: "Canoë 1 — Homme M22",
  C1HM3:  "Canoë 1 — Homme M3",
  C1HU15: "Canoë 1 — Homme U15",
  C1HU18: "Canoë 1 — Homme U18",
  C1HU21: "Canoë 1 — Homme U21",
  C2D:    "Canoë 2 — Dame Senior",
  C2DU15: "Canoë 2 — Dame U15",
  C2H:    "Canoë 2 — Homme Senior",
  C2HM:   "Canoë 2 — Homme Master",
  C2HU15: "Canoë 2 — Homme U15",
  C2HU18: "Canoë 2 — Homme U18",
  C2M:    "Canoë 2 — Mixte Senior",
  C2MU15: "Canoë 2 — Mixte U15",
  K1DM:   "Kayak 1 — Dame Master",
  K1DM22: "Kayak 1 — Dame M22",
  K1DU15: "Kayak 1 — Dame U15",
  K1DU18: "Kayak 1 — Dame U18",
  K1DU21: "Kayak 1 — Dame U21",
  K1HM1:  "Kayak 1 — Homme M1",
  K1HM2:  "Kayak 1 — Homme M2",
  K1HM22: "Kayak 1 — Homme M22",
  K1HM3:  "Kayak 1 — Homme M3",
  K1HU15: "Kayak 1 — Homme U15",
  K1HU18: "Kayak 1 — Homme U18",
  K1HU21: "Kayak 1 — Homme U21",
};

export const categories = Object.keys(CATEGORY_LABELS);

type AthleteRow = {
  code_bateau: string;
  nom: string;
  prenom: string | null;
  club: string | null;
  categorie: string;
  rang_national: number | null;
  points_classement: number | null;
  nb_courses_classement: number | null;
};

const SELECT_COLS = "code_bateau, nom, prenom, club, categorie, rang_national, points_classement, nb_courses_classement";

function toAthlete(r: AthleteRow): Athlete {
  return {
    rang:       r.rang_national ?? 999,
    nom_prenom: r.prenom ? `${r.nom} ${r.prenom}` : r.nom,
    club:       r.club ?? "",
    code_bateau: r.code_bateau,
    points:     Number(r.points_classement ?? 0),
    nb_courses: r.nb_courses_classement ?? 0,
  };
}

// Classement complet groupé par catégorie — lu en direct depuis Supabase
// (jamais un snapshot figé) pour toujours refléter le dernier import FFCK.
export async function getClassement(): Promise<Record<string, Athlete[]>> {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from("athletes")
    .select(SELECT_COLS)
    .order("rang_national", { ascending: true, nullsFirst: false });

  const grouped: Record<string, Athlete[]> = {};
  for (const row of (data ?? []) as AthleteRow[]) {
    const cat = row.categorie;
    (grouped[cat] ??= []).push(toAthlete(row));
  }
  return grouped;
}

export async function findAthleteByCodeBateau(
  code: string
): Promise<{ athlete: Athlete; categorie: string } | null> {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from("athletes")
    .select(SELECT_COLS)
    .eq("code_bateau", code)
    .maybeSingle();
  if (!data) return null;
  const row = data as AthleteRow;
  return { athlete: toAthlete(row), categorie: row.categorie };
}

export async function searchAthletes(
  q: string,
  cat: string
): Promise<(Athlete & { categorie: string })[]> {
  const supabase = createAdminSupabase();
  let query = supabase
    .from("athletes")
    .select(SELECT_COLS)
    .order("rang_national", { ascending: true, nullsFirst: false })
    .limit(30);

  if (cat) query = query.eq("categorie", cat);
  if (q) {
    // Échappement PostgREST — voir app/api/athletes/search/route.ts pour le
    // pourquoi (guillemets/backslash + valeur entre guillemets doubles).
    const escaped = q.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    query = query.or(
      `nom.ilike."%${escaped}%",prenom.ilike."%${escaped}%",club.ilike."%${escaped}%"`
    );
  }

  const { data } = await query;
  return ((data ?? []) as AthleteRow[]).map((row) => ({
    ...toAthlete(row),
    categorie: row.categorie,
  }));
}
