import {
  calculerScoreComposite,
  ajusterParConfrontations,
  calculerRangEspere,
  sigmaFor,
  probTopN,
  probToCote,
  plafondTop1,
  ALGO_PARAMS,
} from "./bradley-terry";
import type { AthleteInStartlist, CoteResult } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

function isSprintCourse(libelle: string): boolean {
  return libelle.toLowerCase().includes('sprint');
}

function buildCoteResult(
  athlete: AthleteInStartlist,
  forces: Map<string, number>,
  startlistLen: number
): CoteResult {
  const rangEspere = calculerRangEspere(athlete, forces);
  const sigma      = sigmaFor(rangEspere);
  const force      = forces.get(athlete.code_bateau)!;

  const p1  = probTopN(rangEspere, sigma, 1);
  const p3  = probTopN(rangEspere, sigma, 3);
  const p5  = probTopN(rangEspere, sigma, 5);
  const p10 = probTopN(rangEspere, sigma, 10);
  const p20 = probTopN(rangEspere, sigma, 20);

  const placeMoyenne = athlete.places_discipline.length > 0
    ? athlete.places_discipline.reduce((s, p) => s + p, 0) / athlete.places_discipline.length
    : null;

  return {
    code_bateau:             athlete.code_bateau,
    athlete_id:              athlete.athlete_id,
    nom:                     athlete.nom,
    categorie:               athlete.categorie,
    nb_athletes_startlist:   startlistLen,
    rang_national:           athlete.rang_national,
    points_classement:       athlete.points_classement,
    place_moyenne_discipline: placeMoyenne,
    force_score:             force,
    rang_espere:             rangEspere,
    sigma,
    fallback_type:           athlete.fallback_type,
    prob_top1:  p1,  cote_top1:  probToCote(p1,  plafondTop1(athlete.rang_national)),
    prob_top3:  p3,  cote_top3:  probToCote(p3,  ALGO_PARAMS.PLAFOND_TOP3),
    prob_top5:  p5,  cote_top5:  probToCote(p5,  ALGO_PARAMS.PLAFOND_TOP5),
    prob_top10: p10, cote_top10: probToCote(p10, ALGO_PARAMS.PLAFOND_TOP10),
    prob_top20: p20, cote_top20: probToCote(p20, ALGO_PARAMS.PLAFOND_TOP20),
    cote_exact_place: 3.0,
    cote_exact_time:  10.0,
    algo_version:     ALGO_PARAMS.ALGO_VERSION,
  };
}

function computeForces(startlist: AthleteInStartlist[]): Map<string, number> {
  const forces = new Map<string, number>();
  for (const a of startlist) {
    const score = calculerScoreComposite(a, startlist);
    forces.set(a.code_bateau, ajusterParConfrontations(a, startlist, score));
  }
  return forces;
}

// Récupère l'historique discipline d'un athlète pour une compétition nationale
async function fetchPlacesDiscipline(
  codeBateau: string,
  categorie: string,
  isSprint: boolean,
  supabase: SupabaseAny
): Promise<{ places: number[]; fallback: 'discipline' | 'autre_discipline' | 'national_only' }> {

  // Tous résultats nationales 2026 pour cet athlète dans sa catégorie
  const { data: histo } = await supabase
    .from('ffck_resultats')
    .select('rang, dsq, ffck_courses(libelle, ffck_competitions(annee, code_type))')
    .eq('code_bateau', codeBateau)
    .eq('categorie', categorie)
    .eq('dsq', false)
    .not('rang', 'is', null);

  const toutes = (histo ?? []) as {
    rang: number;
    ffck_courses: { libelle: string; ffck_competitions: { annee: number; code_type: string } | null } | null;
  }[];

  // Filtrer nationales 2026
  const nationales2026 = toutes.filter(r => {
    const comp = r.ffck_courses?.ffck_competitions;
    return comp?.annee === 2026 && comp?.code_type !== 'SEL';
  });

  // Même discipline
  const meme = nationales2026
    .filter(r => isSprintCourse(r.ffck_courses?.libelle ?? '') === isSprint)
    .map(r => r.rang);

  if (meme.length > 0) return { places: meme, fallback: 'discipline' };

  // Autre discipline
  const autre = nationales2026
    .filter(r => isSprintCourse(r.ffck_courses?.libelle ?? '') !== isSprint)
    .map(r => r.rang);

  if (autre.length > 0) return { places: autre, fallback: 'autre_discipline' };

  return { places: [], fallback: 'national_only' };
}

// Calcule les cotes depuis ffck_resultats (compétitions FFCK passées)
export async function calculateCotesForCourse(
  courseId: string,
  categorie: string,
  supabase: SupabaseAny
): Promise<CoteResult[]> {

  // Récupérer le libellé de la course pour détecter sprint/classique
  const { data: courseData } = await supabase
    .from('ffck_courses')
    .select('libelle')
    .eq('id', courseId)
    .single();

  const isSprint = isSprintCourse(courseData?.libelle ?? '');

  // Participants de cette course/catégorie
  const { data: resultats } = await supabase
    .from('ffck_resultats')
    .select('code_bateau, athlete_id, coureur1_nom, athletes(rang_national, points_classement, nb_courses_classement)')
    .eq('course_id', courseId)
    .eq('categorie', categorie)
    .eq('dsq', false)
    .not('rang', 'is', null);

  if (!resultats || resultats.length < 2) return [];

  const startlist: AthleteInStartlist[] = [];

  for (const r of resultats) {
    const ath = r.athletes as { rang_national: number; points_classement: number; nb_courses_classement: number } | null;
    if (!ath) continue;

    const { places, fallback } = await fetchPlacesDiscipline(
      r.code_bateau, categorie, isSprint, supabase
    );

    startlist.push({
      code_bateau:          r.code_bateau,
      athlete_id:           r.athlete_id,
      nom:                  r.coureur1_nom ?? r.code_bateau,
      categorie,
      rang_national:        ath.rang_national ?? 999,
      points_classement:    ath.points_classement ?? 0,
      nb_courses_classement: ath.nb_courses_classement ?? 0,
      places_discipline:    places,
      nb_courses_discipline: places.length,
      fallback_type:        fallback,
    });
  }

  if (startlist.length < 2) return [];

  const forces = computeForces(startlist);
  return startlist.map(a => buildCoteResult(a, forces, startlist.length));
}

// Calcule les cotes depuis startlist_entries (compétition future importée via PDF)
export async function calculateCotesFromStartlist(
  courseId: string,
  categorie: string,
  supabase: SupabaseAny
): Promise<CoteResult[]> {

  // Récupérer le libellé de la course
  const { data: courseData } = await supabase
    .from('ffck_courses')
    .select('libelle')
    .eq('id', courseId)
    .single();

  const isSprint = isSprintCourse(courseData?.libelle ?? '');

  const { data: entries } = await supabase
    .from('startlist_entries')
    .select('nom, prenom, code_bateau, athlete_id, athletes(rang_national, points_classement, nb_courses_classement)')
    .eq('course_id', courseId)
    .eq('categorie', categorie)
    .eq('is_biplace', false)
    .not('athlete_id', 'is', null);

  if (!entries || entries.length < 2) return [];

  const startlist: AthleteInStartlist[] = [];

  for (const e of entries) {
    const ath = e.athletes as { rang_national: number; points_classement: number; nb_courses_classement: number } | null;
    if (!ath) continue;

    const codeBateau = e.code_bateau ?? e.athlete_id;

    const { places, fallback } = await fetchPlacesDiscipline(
      codeBateau, categorie, isSprint, supabase
    );

    startlist.push({
      code_bateau:           codeBateau,
      athlete_id:            e.athlete_id,
      nom:                   `${e.nom} ${e.prenom}`.trim(),
      categorie,
      rang_national:         ath.rang_national ?? 999,
      points_classement:     ath.points_classement ?? 0,
      nb_courses_classement: ath.nb_courses_classement ?? 0,
      places_discipline:     places,
      nb_courses_discipline: places.length,
      fallback_type:         fallback,
    });
  }

  if (startlist.length < 2) return [];

  const forces = computeForces(startlist);
  return startlist.map(a => buildCoteResult(a, forces, startlist.length));
}

export async function saveCotes(
  courseId: string,
  cotes: CoteResult[],
  supabase: SupabaseAny
): Promise<void> {
  const rows = cotes.map(c => ({
    course_id: courseId,
    ...c,
    calculated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('cotes')
    .upsert(rows, { onConflict: 'course_id,code_bateau' });

  if (error) throw new Error(error.message);
}
