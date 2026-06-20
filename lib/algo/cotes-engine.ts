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

type HistoRow = {
  code_bateau: string;
  rang: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ffck_courses: any;
};

type ResultatRow = {
  code_bateau: string;
  athlete_id: string | null;
  coureur1_nom: string | null;
  athletes: { rang_national: number; points_classement: number; nb_courses_classement: number } | null;
};

type EntryRow = {
  nom: string;
  prenom: string;
  code_bateau: string | null;
  athlete_id: string;
  athletes: { rang_national: number; points_classement: number; nb_courses_classement: number } | null;
};

type HistoryResult = {
  places: number[];
  fallback: 'discipline' | 'autre_discipline' | 'national_only';
};

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

// Trie une fois, passe le rang pré-calculé à calculerScoreComposite — pas de re-tri par athlète
function computeForces(startlist: AthleteInStartlist[]): Map<string, number> {
  const sorted   = [...startlist].sort((a, b) => a.rang_national - b.rang_national);
  const rangMap  = new Map(sorted.map((a, i) => [a.code_bateau, i + 1]));

  const forces = new Map<string, number>();
  for (const a of startlist) {
    const rangRelatif = rangMap.get(a.code_bateau) ?? startlist.length;
    const score = calculerScoreComposite(a, rangRelatif);
    forces.set(a.code_bateau, ajusterParConfrontations(a, startlist, score));
  }
  return forces;
}

// Une seule requête pour tous les athlètes — remplace fetchPlacesDiscipline appelée N fois
async function fetchAllDisciplineHistory(
  codeBateaux: string[],
  categorie: string,
  isSprint: boolean,
  supabase: SupabaseAny
): Promise<Map<string, HistoryResult>> {
  const annee = new Date().getFullYear();

  // Init : tous en national_only par défaut
  const result = new Map<string, HistoryResult>();
  for (const cb of codeBateaux) result.set(cb, { places: [], fallback: 'national_only' });

  if (codeBateaux.length === 0) return result;

  const { data: histoRaw } = await supabase
    .from('ffck_resultats')
    .select('code_bateau, rang, ffck_courses(libelle, ffck_competitions(annee, code_type))')
    .in('code_bateau', codeBateaux)
    .eq('categorie', categorie)
    .eq('dsq', false)
    .not('rang', 'is', null);

  const histo = (histoRaw ?? []) as HistoRow[];

  // Accumulateurs par athlete
  const byCode = new Map<string, { disc: number[]; autre: number[] }>();
  for (const cb of codeBateaux) byCode.set(cb, { disc: [], autre: [] });

  for (const r of histo) {
    const comp = (r.ffck_courses as {
      libelle?: string;
      ffck_competitions?: { annee?: number; code_type?: string } | null;
    } | null)?.ffck_competitions;
    if (!comp || comp.annee !== annee || comp.code_type === 'SEL') continue;

    const libelle = (r.ffck_courses as { libelle?: string } | null)?.libelle ?? '';
    const entry   = byCode.get(r.code_bateau as string);
    if (!entry) continue;

    if (isSprintCourse(libelle) === isSprint) entry.disc.push(r.rang as number);
    else                                       entry.autre.push(r.rang as number);
  }

  for (const [code, { disc, autre }] of byCode) {
    if (disc.length > 0)       result.set(code, { places: disc,  fallback: 'discipline' });
    else if (autre.length > 0) result.set(code, { places: autre, fallback: 'autre_discipline' });
    // sinon reste 'national_only'
  }

  return result;
}

// Calcule les cotes depuis ffck_resultats (compétitions FFCK passées)
export async function calculateCotesForCourse(
  courseId: string,
  categorie: string,
  supabase: SupabaseAny
): Promise<CoteResult[]> {

  const { data: courseData } = await supabase
    .from('ffck_courses')
    .select('libelle')
    .eq('id', courseId)
    .single();

  const isSprint = isSprintCourse(courseData?.libelle ?? '');

  const { data: resultats } = await supabase
    .from('ffck_resultats')
    .select('code_bateau, athlete_id, coureur1_nom, athletes(rang_national, points_classement, nb_courses_classement)')
    .eq('course_id', courseId)
    .eq('categorie', categorie)
    .eq('dsq', false)
    .not('rang', 'is', null);

  if (!resultats || resultats.length < 2) return [];

  const validResultats = (resultats as ResultatRow[]).filter(r => r.athletes && r.code_bateau);
  if (validResultats.length < 2) return [];

  // Batch : une seule requête pour tout l'historique
  const codeBateaux = validResultats.map(r => r.code_bateau);
  const historyMap  = await fetchAllDisciplineHistory(codeBateaux, categorie, isSprint, supabase);

  const startlist: AthleteInStartlist[] = validResultats.map(r => {
    const ath = r.athletes!;
    const { places, fallback } = historyMap.get(r.code_bateau) ?? { places: [], fallback: 'national_only' as const };
    return {
      code_bateau:           r.code_bateau,
      athlete_id:            r.athlete_id,
      nom:                   r.coureur1_nom ?? r.code_bateau,
      categorie,
      rang_national:         ath.rang_national ?? 999,
      points_classement:     ath.points_classement ?? 0,
      nb_courses_classement: ath.nb_courses_classement ?? 0,
      places_discipline:     places,
      nb_courses_discipline: places.length,
      fallback_type:         fallback,
    };
  });

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

  const validEntries = (entries as EntryRow[]).filter(e => e.athletes);
  if (validEntries.length < 2) return [];

  // Seuls les athlètes avec un code_bateau réel peuvent avoir un historique
  // (un UUID athlete_id ne correspond à aucune ligne ffck_resultats.code_bateau)
  const codeBateaux = validEntries
    .map(e => e.code_bateau)
    .filter((cb): cb is string => cb !== null && cb !== undefined && cb.trim() !== '');

  const historyMap = codeBateaux.length > 0
    ? await fetchAllDisciplineHistory(codeBateaux, categorie, isSprint, supabase)
    : new Map<string, HistoryResult>();

  const startlist: AthleteInStartlist[] = validEntries.map(e => {
    const ath        = e.athletes!;
    const codeBateau = e.code_bateau;

    // Sans code_bateau → pas d'historique possible, national_only
    const { places, fallback } = codeBateau
      ? (historyMap.get(codeBateau) ?? { places: [], fallback: 'national_only' as const })
      : { places: [], fallback: 'national_only' as const };

    // Pour la clé interne on utilise le code_bateau ou l'athlete_id si absent
    const key = codeBateau ?? (e.athlete_id as string);

    return {
      code_bateau:           key,
      athlete_id:            e.athlete_id,
      nom:                   `${e.nom} ${e.prenom}`.trim(),
      categorie,
      rang_national:         ath.rang_national ?? 999,
      points_classement:     ath.points_classement ?? 0,
      nb_courses_classement: ath.nb_courses_classement ?? 0,
      places_discipline:     places,
      nb_courses_discipline: places.length,
      fallback_type:         fallback,
    };
  });

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
