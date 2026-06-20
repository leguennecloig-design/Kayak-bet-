import type { AthleteInStartlist } from "./types";

export const ALGO_PARAMS = {
  K_FORCE: 0.20,
  WEIGHT_RANG_BASE: 0.40,  // poids rang quand 4+ courses dispo
  WEIGHT_RANG_MAX: 0.80,   // poids rang quand 0 course dispo
  SIGMA_FACTOR: 0.55,
  SIGMA_MIN: 0.80,
  BONUS_CONFRONTATION: 0.30,
  MARGE: 1.10,
  COTE_MIN: 1.05,
  PLAFOND_TOP1_RANG_10: 12.0,
  PLAFOND_TOP1_RANG_20: 15.0,
  PLAFOND_TOP1_AU_DELA: 30.0,
  PLAFOND_TOP3: 30.0,
  PLAFOND_TOP5: 20.0,
  PLAFOND_TOP10: 10.0,
  PLAFOND_TOP20: 5.0,
  ALGO_VERSION: 'v2.0',
} as const;

// CDF normale — approximation Abramowitz & Stegun (pas de dépendance externe)
export function cumulativeNormal(z: number): number {
  const sign = z >= 0 ? 1 : -1;
  const x    = Math.abs(z);
  const t    = 1 / (1 + 0.2316419 * x);
  const poly = t * (0.319381530
    + t * (-0.356563782
    + t * (1.781477937
    + t * (-1.821255978
    + t * 1.330274429))));
  const pdf = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return sign === 1 ? cdf : 1 - cdf;
}

// Étape 1 — Score composite discipline-spécifique
export function calculerScoreComposite(
  athlete: AthleteInStartlist,
  allInStartlist: AthleteInStartlist[]
): number {
  const { K_FORCE, WEIGHT_RANG_BASE, WEIGHT_RANG_MAX } = ALGO_PARAMS;

  // Score rang national (log pour compresser les écarts)
  const sortedByRang = [...allInStartlist].sort((a, b) => a.rang_national - b.rang_national);
  const rangRelatif  = sortedByRang.findIndex(a => a.code_bateau === athlete.code_bateau) + 1;
  const scoreRang    = 1 / (1 + Math.log(Math.max(rangRelatif, 1)));

  // Score place moyenne discipline
  let scorePerf = scoreRang * 0.85;  // valeur par défaut si aucune perf
  const n = athlete.nb_courses_discipline;

  if (n > 0) {
    const placeMoyenne = athlete.places_discipline.reduce((s, p) => s + p, 0) / n;
    scorePerf = 1 / (1 + Math.log(Math.max(placeMoyenne, 1)));

    // Fiabilité croissante avec le nb de courses
    let fiabilite = Math.min(1.0, 0.55 + 0.11 * n);
    if (athlete.fallback_type === 'autre_discipline') fiabilite *= 0.75;

    scorePerf *= fiabilite;
  }

  // Poids dynamique : plus de courses → plus confiance aux perfs réelles
  const wRang = Math.max(WEIGHT_RANG_BASE, WEIGHT_RANG_MAX - 0.10 * n);
  const wPerf = 1 - wRang;

  // Utilise K_FORCE pour décroissance (harmonise avec l'ancien param K)
  void K_FORCE; // paramètre disponible pour les ajustements futurs

  return wRang * scoreRang + wPerf * scorePerf;
}

// Étape 2 — Ajustement confrontations directes (±BONUS_CONFRONTATION)
export function ajusterParConfrontations(
  athlete: AthleteInStartlist,
  allInStartlist: AthleteInStartlist[],
  scoreComposite: number
): number {
  const { BONUS_CONFRONTATION } = ALGO_PARAMS;

  let bonusTotal = 0;
  let nComparaisons = 0;

  for (const adversaire of allInStartlist) {
    if (adversaire.code_bateau === athlete.code_bateau) continue;
    const placesA = athlete.places_discipline;
    const placesB = adversaire.places_discipline;
    if (placesA.length === 0 || placesB.length === 0) continue;

    const nCommun = Math.min(placesA.length, placesB.length);
    const victoiresA = placesA.slice(0, nCommun).filter((p, i) => p < placesB[i]).length;
    bonusTotal += (victoiresA / nCommun) - 0.5;
    nComparaisons++;
  }

  if (nComparaisons === 0) return scoreComposite;
  return scoreComposite * (1 + BONUS_CONFRONTATION * (bonusTotal / nComparaisons));
}

// Étape 3 — Rang espéré Bradley-Terry
export function calculerRangEspere(
  athlete: AthleteInStartlist,
  forces: Map<string, number>
): number {
  const fi = forces.get(athlete.code_bateau)!;
  let expected = 1;
  for (const [code, fj] of forces.entries()) {
    if (code !== athlete.code_bateau) expected += fj / (fi + fj);
  }
  return expected;
}

// Étape 4 — Probabilité top N via CDF normale
export function probTopN(rangEspere: number, sigma: number, n: number): number {
  const z = (n + 0.5 - rangEspere) / sigma;
  return Math.min(Math.max(cumulativeNormal(z), 0.005), 0.97);
}

export function sigmaFor(rangEspere: number): number {
  const { SIGMA_FACTOR, SIGMA_MIN } = ALGO_PARAMS;
  return Math.max(SIGMA_MIN, SIGMA_FACTOR * Math.sqrt(rangEspere));
}

// Étape 5 — Conversion prob → cote avec plafond par marché
export function probToCote(prob: number, plafond: number): number {
  const { MARGE, COTE_MIN } = ALGO_PARAMS;
  const raw  = MARGE / prob;
  const cote = Math.min(Math.max(raw, COTE_MIN), plafond);
  // Arrondi au 0.05 via entiers — évite les erreurs IEEE 754
  return Math.round(cote * 20) / 20;
}

export function plafondTop1(rangNational: number): number {
  const { PLAFOND_TOP1_RANG_10, PLAFOND_TOP1_RANG_20, PLAFOND_TOP1_AU_DELA } = ALGO_PARAMS;
  if (rangNational <= 10) return PLAFOND_TOP1_RANG_10;
  if (rangNational <= 20) return PLAFOND_TOP1_RANG_20;
  return PLAFOND_TOP1_AU_DELA;
}
