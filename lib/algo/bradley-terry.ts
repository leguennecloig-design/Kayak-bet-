import type { AthleteInStartlist } from "./types";

export const ALGO_PARAMS = {
  K_FORCE: 0.20,
  WEIGHT_RANG_BASE: 0.40,
  WEIGHT_RANG_MAX: 0.80,
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

// CDF normale — approximation Abramowitz & Stegun
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

// Étape 1 — Score composite (rangRelatif pré-calculé par computeForces — pas de re-tri ici)
export function calculerScoreComposite(
  athlete: AthleteInStartlist,
  rangRelatif: number,
): number {
  const { WEIGHT_RANG_BASE, WEIGHT_RANG_MAX } = ALGO_PARAMS;

  const scoreRang = 1 / (1 + Math.log(Math.max(rangRelatif, 1)));

  const n = athlete.nb_courses_discipline;
  let scorePerf = scoreRang * 0.85;

  if (n > 0) {
    const placeMoyenne = athlete.places_discipline.reduce((s, p) => s + p, 0) / n;
    scorePerf = 1 / (1 + Math.log(Math.max(placeMoyenne, 1)));
    let fiabilite = Math.min(1.0, 0.55 + 0.11 * n);
    if (athlete.fallback_type === 'autre_discipline') fiabilite *= 0.75;
    scorePerf *= fiabilite;
  }

  const wRang = Math.max(WEIGHT_RANG_BASE, WEIGHT_RANG_MAX - 0.10 * n);
  const wPerf = 1 - wRang;

  return wRang * scoreRang + wPerf * scorePerf;
}

// Étape 2 — Ajustement confrontations directes
// Désactivé : places_discipline est un tableau positionnel sans alignement temporel.
// Comparer les indices [0],[1],... de deux athlètes revient à comparer des courses
// différentes — le résultat est du bruit, pas une vraie confrontation directe.
export function ajusterParConfrontations(
  _athlete: AthleteInStartlist,
  _allInStartlist: AthleteInStartlist[],
  scoreComposite: number
): number {
  return scoreComposite;
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
  return Math.round(cote * 20) / 20;
}

export function plafondTop1(rangNational: number): number {
  const { PLAFOND_TOP1_RANG_10, PLAFOND_TOP1_RANG_20, PLAFOND_TOP1_AU_DELA } = ALGO_PARAMS;
  if (rangNational <= 10) return PLAFOND_TOP1_RANG_10;
  if (rangNational <= 20) return PLAFOND_TOP1_RANG_20;
  return PLAFOND_TOP1_AU_DELA;
}
