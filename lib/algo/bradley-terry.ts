import { ALGO_PARAMS } from './params';
import type { AthleteInStartlist } from './types';

// Ré-exporter pour les composants clients (import { ALGO_PARAMS } from '@/lib/algo/bradley-terry')
export { ALGO_PARAMS } from './params';

// Score moyen d'un tableau de places (log pour comprimer les écarts)
function scoreSource(places: number[]): number {
  if (places.length === 0) return 0;
  const moy = places.reduce((s, p) => s + p, 0) / places.length;
  return 1 / (1 + Math.log(Math.max(moy, 1)));
}

function fiabilite(nb: number, base: number, inc: number): number {
  return Math.min(1.0, base + inc * nb);
}

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

// Score composite — poids SEF/NAT/IR/NUM avec redistribution si source absente
export function calculerScoreComposite(a: AthleteInStartlist): number {
  const {
    W_SEF, W_NAT, W_IR, W_NUM,
    FIAB_SEF_BASE, FIAB_SEF_INC,
    FIAB_NAT_BASE, FIAB_NAT_INC,
    FIAB_IR_BASE,  FIAB_IR_INC,
  } = ALGO_PARAMS;

  const scoreNum = 1 / (1 + Math.log(Math.max(a.rang_national, 1)));

  const scoreSef = scoreSource(a.sef) * fiabilite(a.sef.length, FIAB_SEF_BASE, FIAB_SEF_INC);
  const scoreNat = scoreSource(a.nat) * fiabilite(a.nat.length, FIAB_NAT_BASE, FIAB_NAT_INC);
  const scoreIr  = scoreSource(a.ir)  * fiabilite(a.ir.length,  FIAB_IR_BASE,  FIAB_IR_INC);

  // Poids de base — ne garder que les sources avec des données
  const poidsRaw: Record<string, number> = { num: W_NUM };
  if (a.sef.length > 0) poidsRaw['sef'] = W_SEF;
  if (a.nat.length > 0) poidsRaw['nat'] = W_NAT;
  if (a.ir.length  > 0) poidsRaw['ir']  = W_IR;

  // Redistribuer proportionnellement
  const total = Object.values(poidsRaw).reduce((s, p) => s + p, 0);
  const poids: Record<string, number> = {};
  for (const k in poidsRaw) poids[k] = poidsRaw[k] / total;

  let score = poids['num'] * scoreNum;
  if ('sef' in poids) score += poids['sef'] * scoreSef;
  if ('nat' in poids) score += poids['nat'] * scoreNat;
  if ('ir'  in poids) score += poids['ir']  * scoreIr;

  return score;
}

// Ajustement confrontations directes (SEF + NAT uniquement — sources premium)
// Note : on suppose que les N premières courses SEF et NAT sont les mêmes pour
// les deux athlètes au sein d'une même saison. C'est une approximation.
export function ajusterParConfrontations(
  athlete: AthleteInStartlist,
  allInStartlist: AthleteInStartlist[],
  scoreComposite: number
): number {
  const { BONUS_CONFRONTATION } = ALGO_PARAMS;

  const placesA = [...athlete.sef, ...athlete.nat];
  if (placesA.length === 0) return scoreComposite;

  let bonusTotal = 0;
  let nComparaisons = 0;

  for (const b of allInStartlist) {
    if (b.code_bateau === athlete.code_bateau) continue;
    const placesB = [...b.sef, ...b.nat];
    if (placesB.length === 0) continue;

    const nCommun = Math.min(placesA.length, placesB.length);
    if (nCommun === 0) continue;

    const victoiresA = placesA.slice(0, nCommun)
      .filter((p, i) => p < placesB[i]).length;

    bonusTotal += victoiresA / nCommun - 0.5;
    nComparaisons++;
  }

  if (nComparaisons === 0) return scoreComposite;
  return scoreComposite * (1 + BONUS_CONFRONTATION * (bonusTotal / nComparaisons));
}

// Rang espéré Bradley-Terry : E[rang] = 1 + Σ_j≠i [ f_j / (f_i + f_j) ]
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

export function probTopN(rangEspere: number, sigma: number, n: number): number {
  const z = (n + 0.5 - rangEspere) / sigma;
  return Math.min(Math.max(cumulativeNormal(z), 0.005), 0.97);
}

export function sigmaFor(rangEspere: number): number {
  const { SIGMA_FACTOR, SIGMA_MIN } = ALGO_PARAMS;
  return Math.max(SIGMA_MIN, SIGMA_FACTOR * Math.sqrt(rangEspere));
}

export function probToCote(prob: number, plafond: number): number {
  const { MARGE, COTE_MIN } = ALGO_PARAMS;
  const raw  = MARGE / prob;
  const cote = Math.min(Math.max(raw, COTE_MIN), plafond);
  return Math.round(cote / 0.05) * 0.05;  // arrondi au 0.05
}

export function plafondTop1(rangNational: number): number {
  const { PLAFOND_TOP1_RANG_10, PLAFOND_TOP1_RANG_20, PLAFOND_TOP1_AU_DELA } = ALGO_PARAMS;
  if (rangNational <= 10) return PLAFOND_TOP1_RANG_10;
  if (rangNational <= 20) return PLAFOND_TOP1_RANG_20;
  return PLAFOND_TOP1_AU_DELA;
}
