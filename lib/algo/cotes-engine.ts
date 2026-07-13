import {
  calculerScoreComposite,
  ajusterParConfrontations,
  calculerRangEspere,
  estM22AvecSef,
  sigmaFor,
  probTopN,
  probToCote,
  probExactPlace,
  ALGO_PARAMS,
} from './bradley-terry';
import type { AthleteInStartlist, CoteResult, FallbackType } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

function isSprint(libelle: string): boolean {
  return libelle.toLowerCase().includes('sprint');
}

// Identifier la source selon code_niveau / code_type de la compétition
function getSource(codeNiveau: string, codeType: string): 'SEF' | 'NAT' | 'IR' | null {
  if (codeType === 'SEF') return 'SEF';
  if (codeNiveau === 'NAT') return 'NAT';
  if (codeNiveau === 'IR') return 'IR';
  return null;  // CR, SR, SEL → ignoré
}

// Construit la chaîne sources_utilisees pour l'affichage admin
function buildSourcesLabel(sef: number[], nat: number[], ir: number[]): string {
  return [
    sef.length > 0 ? 'SEF' : null,
    nat.length > 0 ? 'NAT' : null,
    ir.length  > 0 ? 'IR'  : null,
    'NUM',
  ].filter(Boolean).join('+');
}

// ── Types internes ────────────────────────────────────────────────────────────

type HistoRow = {
  code_bateau: string;
  rang: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ffck_courses: any;
};

type AthRow = {
  code_bateau: string;
  rang_national: number | null;
  points_classement: number | null;
  nb_courses_classement: number | null;
};

type EntryRow = {
  nom: string;
  prenom: string;
  code_bateau: string | null;
  athlete_id: string | null;
  dossard: number;
  is_biplace: boolean;
};

type AthByIdRow = {
  id: string;
  rang_national: number | null;
  points_classement: number | null;
  nb_courses_classement: number | null;
};

type V3History = {
  sef_disc: number[];
  nat_disc: number[];
  ir_disc:  number[];
  sef_autre: number[];
  nat_autre: number[];
  ir_autre:  number[];
};

// ── Batch fetch historique v3 ─────────────────────────────────────────────────

async function fetchAllV3History(
  codeBateaux: string[],
  categorie: string,
  disciplineEstSprint: boolean,
  supabase: SupabaseAny
): Promise<Map<string, V3History>> {
  const annee = ALGO_PARAMS.SAISON_COTES; // v4 : saison figée 2026, pas l'horloge murale

  const result = new Map<string, V3History>();
  for (const cb of codeBateaux) {
    result.set(cb, { sef_disc: [], nat_disc: [], ir_disc: [], sef_autre: [], nat_autre: [], ir_autre: [] });
  }

  if (codeBateaux.length === 0) return result;

  const { data: histoRaw } = await supabase
    .from('ffck_resultats')
    .select('code_bateau, rang, ffck_courses(libelle, ffck_competitions(annee, code_niveau, code_type))')
    .in('code_bateau', codeBateaux)
    .eq('categorie', categorie)
    .eq('dsq', false)
    .not('rang', 'is', null);

  for (const r of (histoRaw ?? []) as HistoRow[]) {
    const comp = r.ffck_courses?.ffck_competitions as {
      annee?: number; code_niveau?: string; code_type?: string;
    } | null;
    if (!comp || comp.annee !== annee) continue;

    const source = getSource(comp.code_niveau ?? '', comp.code_type ?? '');
    if (!source) continue;

    const libelle = (r.ffck_courses as { libelle?: string })?.libelle ?? '';
    const entry = result.get(r.code_bateau);
    if (!entry) continue;

    const meme = isSprint(libelle) === disciplineEstSprint;

    if (source === 'SEF') {
      meme ? entry.sef_disc.push(r.rang) : entry.sef_autre.push(r.rang);
    } else if (source === 'NAT') {
      meme ? entry.nat_disc.push(r.rang) : entry.nat_autre.push(r.rang);
    } else {
      meme ? entry.ir_disc.push(r.rang) : entry.ir_autre.push(r.rang);
    }
  }

  return result;
}

// Résout le fallback pour un athlète : discipline → autre discipline → national_only
function resolveFallback(h: V3History): {
  sef: number[]; nat: number[]; ir: number[];
  fallback_type: FallbackType;
} {
  const hasDiscipline = h.sef_disc.length > 0 || h.nat_disc.length > 0 || h.ir_disc.length > 0;
  if (hasDiscipline) {
    return { sef: h.sef_disc, nat: h.nat_disc, ir: h.ir_disc, fallback_type: 'discipline' };
  }

  const hasAutre = h.sef_autre.length > 0 || h.nat_autre.length > 0 || h.ir_autre.length > 0;
  if (hasAutre) {
    return { sef: h.sef_autre, nat: h.nat_autre, ir: h.ir_autre, fallback_type: 'autre_discipline' };
  }

  return { sef: [], nat: [], ir: [], fallback_type: 'national_only' };
}

// ── computeForces ─────────────────────────────────────────────────────────────

// v4 — double passe Bradley-Terry pour intégrer "relatif catégorie" (25% std,
// 10% M22-SEF) sans perdre le comparatif intra-catégorie qui produit le rang.
//  1. S_abs (national+numérique[+SEF]) + ajustement confrontations, clampé [0,1].
//  2. 1re passe BT sur S_abs → S_rel ∈ [0,1] (rang relatif dans la catégorie).
//  3. Force finale = (1-wRel)·S_abs + wRel·S_rel. Le buildCoteResult fait la
//     2e passe BT (rang espéré final) sur ces forces.
function computeForces(startlist: AthleteInStartlist[]): Map<string, number> {
  const scoresAbs = new Map<string, number>();
  for (const a of startlist) {
    const base = calculerScoreComposite(a);
    const adj  = ajusterParConfrontations(a, startlist, base);
    scoresAbs.set(a.code_bateau, Math.max(0, Math.min(1, adj)));
  }

  const N = startlist.length;
  const forces = new Map<string, number>();
  for (const a of startlist) {
    const rangEsp1 = calculerRangEspere(a, scoresAbs);
    const sRel = N > 1 ? Math.max(0, Math.min(1, 1 - (rangEsp1 - 1) / (N - 1))) : 1;
    const wRel = estM22AvecSef(a) ? ALGO_PARAMS.V4_M22_W_RELATIF : ALGO_PARAMS.V4_W_RELATIF;
    const sAbs = scoresAbs.get(a.code_bateau)!;
    forces.set(a.code_bateau, (1 - wRel) * sAbs + wRel * sRel);
  }
  return forces;
}

// ── buildCoteResult ───────────────────────────────────────────────────────────

function buildCoteResult(
  a: AthleteInStartlist,
  forces: Map<string, number>,
  scoreComposite: number,
  startlistLen: number
): CoteResult {
  const P = ALGO_PARAMS;
  const rangEspere = calculerRangEspere(a, forces);
  const sigma      = sigmaFor(rangEspere);

  const p1  = probTopN(rangEspere, sigma, 1);
  const p3  = probTopN(rangEspere, sigma, 3);
  const p5  = probTopN(rangEspere, sigma, 5);
  const p10 = probTopN(rangEspere, sigma, 10);
  const p20 = probTopN(rangEspere, sigma, 20);

  // Place exacte — cote REPRÉSENTATIVE (place la plus probable = round(rang
  // espéré)). La vraie cote est calculée dynamiquement selon la place choisie
  // (côté client/serveur, via rang_espere + sigma exposés).
  const placeProbable = Math.max(1, Math.round(rangEspere));
  const pPlace = probExactPlace(rangEspere, sigma, placeProbable);
  const coteExactPlace = probToCote(pPlace, P.COTE_MIN_EXACT, P.COTE_MAX_GLOBAL);

  // Temps exact — pas de modèle de temps absolu : heuristique basée sur la
  // prédictibilité (prob d'être la performance de référence = p1) × précision.
  const coteExactTime = probToCote(p1 * P.K_EXACT_TIME_TENTH, P.COTE_MIN_EXACT, P.COTE_MAX_GLOBAL);
  const coteExactTimeSecond = probToCote(
    p1 * P.K_EXACT_TIME_SECOND,
    P.COTE_MIN_EXACT_TIME_SECOND,
    P.COTE_MAX_EXACT_TIME_SECOND
  );

  return {
    code_bateau:           a.code_bateau,
    athlete_id:            a.athlete_id,
    nom:                   a.nom,
    categorie:             a.categorie,
    nb_athletes_startlist: startlistLen,
    rang_national:         a.rang_national,
    points_classement:     a.points_classement,
    score_composite:       scoreComposite,
    score_final:           forces.get(a.code_bateau)!,
    rang_espere:           rangEspere,
    sigma,
    fallback_type:         a.fallback_type,
    sources_utilisees:     buildSourcesLabel(a.sef, a.nat, a.ir),
    prob_top1:  p1,  cote_top1:  probToCote(p1,  P.COTE_MIN_TOP1, P.COTE_MAX_GLOBAL),
    prob_top3:  p3,  cote_top3:  probToCote(p3,  P.COTE_MIN_TOP3, P.COTE_MAX_GLOBAL),
    prob_top5:  p5,  cote_top5:  probToCote(p5,  P.COTE_MIN_TOP5, P.COTE_MAX_GLOBAL),
    prob_top10: p10, cote_top10: probToCote(p10, P.COTE_MIN_EXACT, P.COTE_MAX_TOP10),
    prob_top20: p20, cote_top20: probToCote(p20, P.COTE_MIN_EXACT, P.COTE_MAX_TOP20),
    cote_exact_place:       coteExactPlace,
    cote_exact_time:        coteExactTime,
    cote_exact_time_second: coteExactTimeSecond,
    algo_version:           P.ALGO_VERSION,
  };
}

// ── calculateCotesForCourse (depuis ffck_resultats) ──────────────────────────

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

  const disciplineEstSprint = isSprint(courseData?.libelle ?? '');

  const { data: resultatsRaw } = await supabase
    .from('ffck_resultats')
    .select('code_bateau, athlete_id, coureur1_nom')
    .eq('course_id', courseId)
    .eq('categorie', categorie)
    .eq('dsq', false)
    .not('rang', 'is', null);

  if (!resultatsRaw || resultatsRaw.length < 2) return [];

  const resultats = resultatsRaw as { code_bateau: string; athlete_id: string | null; coureur1_nom: string | null }[];
  const codeBateaux = resultats.map(r => r.code_bateau);

  // Batch : données athlètes
  const { data: athRaw } = await supabase
    .from('athletes')
    .select('code_bateau, rang_national, points_classement, nb_courses_classement')
    .in('code_bateau', codeBateaux);

  const athMap = new Map<string, AthRow>();
  for (const a of (athRaw ?? []) as AthRow[]) athMap.set(a.code_bateau, a);

  // Batch : historique v3
  const historyMap = await fetchAllV3History(codeBateaux, categorie, disciplineEstSprint, supabase);

  const startlist: AthleteInStartlist[] = [];
  for (const r of resultats) {
    const ath = athMap.get(r.code_bateau);
    const h   = historyMap.get(r.code_bateau) ?? { sef_disc: [], nat_disc: [], ir_disc: [], sef_autre: [], nat_autre: [], ir_autre: [] };
    const { sef, nat, ir, fallback_type } = resolveFallback(h);
    startlist.push({
      code_bateau:           r.code_bateau,
      athlete_id:            r.athlete_id,
      nom:                   r.coureur1_nom ?? r.code_bateau,
      categorie,
      rang_national:         ath?.rang_national ?? 999,
      points_classement:     ath?.points_classement ?? 0,
      nb_courses_classement: ath?.nb_courses_classement ?? 0,
      sef, nat, ir, fallback_type,
    });
  }

  if (startlist.length < 2) return [];

  const forces = computeForces(startlist);
  const scores = new Map(startlist.map(a => [a.code_bateau, calculerScoreComposite(a)]));
  return startlist.map(a => buildCoteResult(a, forces, scores.get(a.code_bateau)!, startlist.length));
}

// ── calculateCotesFromStartlist (depuis startlist_entries — PDF) ──────────────

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

  const disciplineEstSprint = isSprint(courseData?.libelle ?? '');

  // Requête sans FK join pour inclure TOUS les athlètes, même non matchés (athlete_id=null)
  // Le join athletes(...) ferait un INNER JOIN implicite et exclurait les non matchés
  const { data: entriesRaw } = await supabase
    .from('startlist_entries')
    .select('nom, prenom, code_bateau, athlete_id, dossard, is_biplace')
    .eq('course_id', courseId)
    .eq('categorie', categorie);

  if (!entriesRaw || entriesRaw.length < 2) return [];

  const entries = entriesRaw as EntryRow[];

  // Fetch séparé des données de classement pour les athlètes matchés
  const athleteIds = [...new Set(
    entries.map(e => e.athlete_id).filter((id): id is string => id !== null)
  )];
  const athByIdMap = new Map<string, { rang_national: number; points_classement: number; nb_courses_classement: number }>();
  if (athleteIds.length > 0) {
    const { data: athRaw } = await supabase
      .from('athletes')
      .select('id, rang_national, points_classement, nb_courses_classement')
      .in('id', athleteIds);
    for (const a of (athRaw ?? []) as AthByIdRow[]) {
      athByIdMap.set(a.id, {
        rang_national:         a.rang_national         ?? 999,
        points_classement:     a.points_classement     ?? 0,
        nb_courses_classement: a.nb_courses_classement ?? 0,
      });
    }
  }
  const getAthData = (athlete_id: string | null) =>
    athlete_id
      ? (athByIdMap.get(athlete_id) ?? { rang_national: 999, points_classement: 0, nb_courses_classement: 0 })
      : { rang_national: 999, points_classement: 0, nb_courses_classement: 0 };

  const isBiplaceCategorie = entries.some(e => e.is_biplace);

  let processedAthletes: AthleteInStartlist[];

  if (isBiplaceCategorie) {
    // C2 biplace : grouper par dossard → un bateau = une cote
    const byDossard = new Map<number, EntryRow[]>();
    for (const e of entries) {
      const grp = byDossard.get(e.dossard) ?? [];
      grp.push(e);
      byDossard.set(e.dossard, grp);
    }

    processedAthletes = [...byDossard.values()].map(grp => {
      const e1 = grp[0];
      const e2 = grp[1] ?? null;

      const ath1 = getAthData(e1.athlete_id);
      const ath2 = e2 ? getAthData(e2.athlete_id) : null;
      const bestRang = Math.min(ath1.rang_national, ath2?.rang_national ?? 999);

      const nom1 = `${e1.nom} ${e1.prenom}`.trim();
      const nom2 = e2 ? `${e2.nom} ${e2.prenom}`.trim() : '';
      const nomBateau = e2 ? `${nom1} / ${nom2}` : nom1;

      const codeBateau = e1.code_bateau ?? `${categorie}-${e1.dossard}`;

      return {
        code_bateau:           codeBateau,
        athlete_id:            e1.athlete_id,
        nom:                   nomBateau,
        categorie,
        rang_national:         bestRang,
        points_classement:     ath1.points_classement,
        nb_courses_classement: ath1.nb_courses_classement,
        // C2 : pas de lookup historique possible (code bateau individuel ≠ code bateau C2 FFCK)
        sef: [], nat: [], ir: [],
        fallback_type: 'national_only' as FallbackType,
      };
    });
  } else {
    // Monoplace : un athlète = une entrée (non matchés inclus avec rang_national=999)
    const codeBateaux = entries
      .map(e => e.code_bateau)
      .filter((cb): cb is string => cb !== null && cb !== undefined && cb.trim() !== '');

    const historyMap = codeBateaux.length > 0
      ? await fetchAllV3History(codeBateaux, categorie, disciplineEstSprint, supabase)
      : new Map<string, V3History>();

    processedAthletes = entries.map(e => {
      const cb = e.code_bateau ?? null;
      const h  = cb
        ? (historyMap.get(cb) ?? { sef_disc: [], nat_disc: [], ir_disc: [], sef_autre: [], nat_autre: [], ir_autre: [] })
        : { sef_disc: [], nat_disc: [], ir_disc: [], sef_autre: [], nat_autre: [], ir_autre: [] };
      const { sef, nat, ir, fallback_type } = resolveFallback(h);
      const ath = getAthData(e.athlete_id);

      const key = cb ?? (`${categorie}-${e.dossard}`);
      return {
        code_bateau:           key,
        athlete_id:            e.athlete_id,
        nom:                   `${e.nom} ${e.prenom}`.trim(),
        categorie,
        rang_national:         ath.rang_national,
        points_classement:     ath.points_classement,
        nb_courses_classement: ath.nb_courses_classement,
        sef, nat, ir, fallback_type,
      };
    });
  }

  if (processedAthletes.length < 2) return [];

  const forces = computeForces(processedAthletes);
  const scores = new Map(processedAthletes.map(a => [a.code_bateau, calculerScoreComposite(a)]));
  return processedAthletes.map(a => buildCoteResult(a, forces, scores.get(a.code_bateau)!, processedAthletes.length));
}

// ── saveCotes (ancien système course_id) ─────────────────────────────────────

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

// ── saveCotesForCompetition (nouveau système competition_id) ──────────────────

export async function saveCotesForCompetition(
  competitionId: string,
  cotes: CoteResult[],
  supabase: SupabaseAny
): Promise<void> {
  const rows = cotes.map(c => ({
    competition_id:        competitionId,
    ...c,
    // Colonnes INTEGER : arrondi pour éviter les erreurs Postgres
    rang_national:         Math.round(c.rang_national),
    nb_athletes_startlist: Math.round(c.nb_athletes_startlist),
    // rang_espere est NUMERIC (float) en base — on le garde tel quel
    calculated_at:         new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('cotes')
    .upsert(rows, { onConflict: 'competition_id,code_bateau' });

  if (error) throw new Error(error.message);
}

// ── calculateCotesFromInscriptions (FFCK inscriptions → algo) ────────────────

type InscriptionRow2 = {
  code_bateau: string;
  nom: string;
  athlete_id: string | null;
};

// Les entrées sont passées directement depuis la route (pas de re-query par epreuve)
export type InscriptionEntry = { code_bateau: string; nom: string; athlete_id: string | null };

export async function calculateCotesFromInscriptions(
  entries: InscriptionEntry[],
  categorie: string,
  disciplineEstSprint: boolean,
  supabase: SupabaseAny
): Promise<CoteResult[]> {
  if (!entries || entries.length < 2) return [];

  // entries est déjà fourni par l'appelant

  // Fetch données de classement : d'abord par athlete_id, puis fallback par code_bateau direct
  const athleteIds = [...new Set(
    entries.map(e => e.athlete_id).filter((id): id is string => id !== null)
  )];
  const codeBateauxAll = entries.map(e => e.code_bateau);

  const athByIdMap = new Map<string, { rang_national: number; points_classement: number; nb_courses_classement: number }>();
  const athByCodeMap = new Map<string, { rang_national: number; points_classement: number; nb_courses_classement: number }>();

  // Lookup par ID
  if (athleteIds.length > 0) {
    const { data: athRaw } = await supabase
      .from('athletes')
      .select('id, rang_national, points_classement, nb_courses_classement')
      .in('id', athleteIds);
    for (const a of (athRaw ?? []) as AthByIdRow[]) {
      athByIdMap.set(a.id, {
        rang_national:         a.rang_national         ?? 999,
        points_classement:     a.points_classement     ?? 0,
        nb_courses_classement: a.nb_courses_classement ?? 0,
      });
    }
  }

  // Lookup par code_bateau direct (couvre les athlètes non liés via athlete_id)
  if (codeBateauxAll.length > 0) {
    const { data: athCodeRaw } = await supabase
      .from('athletes')
      .select('code_bateau, rang_national, points_classement, nb_courses_classement')
      .in('code_bateau', codeBateauxAll);
    for (const a of (athCodeRaw ?? []) as AthRow[]) {
      athByCodeMap.set(a.code_bateau, {
        rang_national:         a.rang_national         ?? 999,
        points_classement:     a.points_classement     ?? 0,
        nb_courses_classement: a.nb_courses_classement ?? 0,
      });
    }
  }

  const getAthData = (athlete_id: string | null, code_bateau: string) => {
    if (athlete_id && athByIdMap.has(athlete_id)) return athByIdMap.get(athlete_id)!;
    if (athByCodeMap.has(code_bateau)) return athByCodeMap.get(code_bateau)!;
    return { rang_national: 999, points_classement: 0, nb_courses_classement: 0 };
  };

  // C2 biplaces : pas de lookup historique possible
  if (categorie.startsWith('C2')) {
    const processedAthletes: AthleteInStartlist[] = entries.map(e => {
      const ath = getAthData(e.athlete_id, e.code_bateau);
      return {
        code_bateau:           e.code_bateau,
        athlete_id:            e.athlete_id,
        nom:                   e.nom,
        categorie,
        rang_national:         ath.rang_national,
        points_classement:     ath.points_classement,
        nb_courses_classement: ath.nb_courses_classement,
        sef: [], nat: [], ir: [],
        fallback_type: 'national_only' as FallbackType,
      };
    });
    const toProcess = selectAthletes(processedAthletes);
    if (toProcess.length < 2) return [];
    const forces = computeForces(toProcess);
    const scores = new Map(toProcess.map(a => [a.code_bateau, calculerScoreComposite(a)]));
    return toProcess.map(a => buildCoteResult(a, forces, scores.get(a.code_bateau)!, toProcess.length));
  }

  // Monoplace : lookup historique par code_bateau (robuste si ffck_resultats indisponible)
  let historyMap: Awaited<ReturnType<typeof fetchAllV3History>>;
  try {
    historyMap = await fetchAllV3History(codeBateauxAll, categorie, disciplineEstSprint, supabase);
  } catch {
    historyMap = new Map();
  }

  const processedAthletes: AthleteInStartlist[] = entries.map(e => {
    const h   = historyMap.get(e.code_bateau) ?? { sef_disc: [], nat_disc: [], ir_disc: [], sef_autre: [], nat_autre: [], ir_autre: [] };
    const { sef, nat, ir, fallback_type } = resolveFallback(h);
    const ath = getAthData(e.athlete_id, e.code_bateau);
    return {
      code_bateau:           e.code_bateau,
      athlete_id:            e.athlete_id,
      nom:                   e.nom,
      categorie,
      rang_national:         ath.rang_national,
      points_classement:     ath.points_classement,
      nb_courses_classement: ath.nb_courses_classement,
      sef, nat, ir, fallback_type,
    };
  });

  const toProcess = selectAthletes(processedAthletes);
  if (toProcess.length < 2) return [];
  const forces = computeForces(toProcess);
  const scores = new Map(toProcess.map(a => [a.code_bateau, calculerScoreComposite(a)]));
  return toProcess.map(a => buildCoteResult(a, forces, scores.get(a.code_bateau)!, toProcess.length));
}

// Sélectionne les athlètes à inclure dans le calcul :
// - Si ≥ 2 athlètes "connus" (rang < 999 ou résultats en base) → seulement les connus
// - Sinon → tous les athlètes (pas assez de données pour discriminer)
function selectAthletes(athletes: AthleteInStartlist[]): AthleteInStartlist[] {
  const known = athletes.filter(
    a => a.rang_national < 999 || a.sef.length > 0 || a.nat.length > 0 || a.ir.length > 0
  );
  return known.length >= 2 ? known : athletes;
}
