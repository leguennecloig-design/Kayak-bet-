import {
  calculerForce,
  calculerRangEspere,
  sigmaFor,
  probTopN,
  probToCote,
  ALGO_PARAMS,
} from "./bradley-terry";
import type { AthleteInStartlist, CoteResult } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

type AthRow = {
  rang_national: number;
  points_classement: number;
  nb_courses_classement: number;
} | null;

type ResultatRow = {
  code_bateau: string;
  athlete_id: string | null;
  categorie: string;
  rang: number | null;
  coureur1_nom: string | null;
  athletes: AthRow;
};

export async function calculateCotesForCourse(
  courseId: string,
  categorie: string,
  supabase: SupabaseAny
): Promise<CoteResult[]> {
  const { data } = await supabase
    .from("ffck_resultats")
    .select(`
      code_bateau,
      athlete_id,
      categorie,
      rang,
      coureur1_nom,
      athletes (
        rang_national,
        points_classement,
        nb_courses_classement
      )
    `)
    .eq("course_id", courseId)
    .eq("categorie", categorie)
    .eq("dsq", false)
    .not("rang", "is", null);

  const resultats = (data ?? []) as ResultatRow[];

  if (!resultats || resultats.length === 0) return [];

  const startlist: AthleteInStartlist[] = resultats
    .filter((r) => r.athletes)
    .map((r) => {
      const ath = r.athletes as AthRow;
      return {
        code_bateau: r.code_bateau as string,
        athlete_id: r.athlete_id as string | null,
        nom: (r.coureur1_nom as string | null) ?? r.code_bateau,
        categorie: r.categorie as string,
        rang_national: ath?.rang_national ?? 999,
        points_classement: ath?.points_classement ?? 0,
        nb_courses_classement: ath?.nb_courses_classement ?? 1,
      };
    });

  if (startlist.length < 2) return [];

  const forces = new Map<string, number>();
  for (const athlete of startlist) {
    forces.set(athlete.code_bateau, calculerForce(athlete, startlist));
  }

  const results: CoteResult[] = [];
  for (const athlete of startlist) {
    const rangEspere = calculerRangEspere(athlete, forces);
    const sigma      = sigmaFor(rangEspere);
    const force      = forces.get(athlete.code_bateau)!;

    const p1  = probTopN(rangEspere, sigma, 1);
    const p3  = probTopN(rangEspere, sigma, 3);
    const p5  = probTopN(rangEspere, sigma, 5);
    const p10 = probTopN(rangEspere, sigma, 10);
    const p20 = probTopN(rangEspere, sigma, 20);

    results.push({
      code_bateau:          athlete.code_bateau,
      athlete_id:           athlete.athlete_id,
      nom:                  athlete.nom,
      categorie:            athlete.categorie,
      nb_athletes_startlist: startlist.length,
      rang_national:        athlete.rang_national,
      points_classement:    athlete.points_classement,
      force_score:          force,
      rang_espere:          rangEspere,
      sigma,
      prob_top1:  p1,  cote_top1:  probToCote(p1),
      prob_top3:  p3,  cote_top3:  probToCote(p3),
      prob_top5:  p5,  cote_top5:  probToCote(p5),
      prob_top10: p10, cote_top10: probToCote(p10),
      prob_top20: p20, cote_top20: probToCote(p20),
      cote_exact_place: 3.0,
      cote_exact_time:  10.0,
    });
  }

  return results;
}

export async function saveCotes(
  courseId: string,
  cotes: CoteResult[],
  supabase: SupabaseAny
): Promise<void> {
  const rows = cotes.map((c) => ({
    course_id: courseId,
    ...c,
    calculated_at: new Date().toISOString(),
    algo_version: ALGO_PARAMS.ALGO_VERSION,
  }));

  const { error } = await supabase
    .from("cotes")
    .upsert(rows, { onConflict: "course_id,code_bateau" });

  if (error) throw new Error(error.message);
}
