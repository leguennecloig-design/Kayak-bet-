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

// M22 avec résultats SEF 2026 → pondération spéciale (SEF prioritaire).
export function estM22AvecSef(a: AthleteInStartlist): boolean {
  return a.categorie.toUpperCase().includes('M22') && a.sef.length > 0;
}

// Score composite ABSOLU v4 ∈ [0,1] — national (N1 71% / IR 29%) + numérique
// (+ SEF pour M22). Le "relatif catégorie" (Bradley-Terry) n'est PAS ici : il
// est mélangé plus tard dans la force finale (voir computeForces). Renormalise
// sur les sources présentes. Pénalité si repli sur l'autre discipline.
export function calculerScoreComposite(a: AthleteInStartlist): number {
  const P = ALGO_PARAMS;

  // Classement numérique 2026 (toujours présent)
  const scoreNum = 1 / (1 + Math.log(Math.max(a.rang_national, 1)));

  // Pénalité fallback autre discipline sur les scores de course
  const pen = a.fallback_type === 'autre_discipline' ? P.FIAB_FALLBACK_AUTRE_DISCIPLINE : 1;

  // National = N1 (nat) + IR sous-pondérés 71/29, chacun fiabilisé
  const scoreN1 = a.nat.length > 0 ? scoreSource(a.nat) * fiabilite(a.nat.length, P.FIAB_NAT_BASE, P.FIAB_NAT_INC) : null;
  const scoreIr = a.ir.length  > 0 ? scoreSource(a.ir)  * fiabilite(a.ir.length,  P.FIAB_IR_BASE,  P.FIAB_IR_INC)  : null;
  let scoreNat: number | null = null;
  if (scoreN1 !== null && scoreIr !== null) scoreNat = P.V4_N1_RATIO * scoreN1 + P.V4_IR_RATIO * scoreIr;
  else if (scoreN1 !== null) scoreNat = scoreN1;
  else if (scoreIr !== null) scoreNat = scoreIr;
  if (scoreNat !== null) scoreNat *= pen;

  // SEF (M22 uniquement, si résultats disponibles)
  const useM22Sef = estM22AvecSef(a);
  const scoreSef = useM22Sef
    ? scoreSource(a.sef) * fiabilite(a.sef.length, P.FIAB_SEF_BASE, P.FIAB_SEF_INC) * pen
    : null;

  // Poids absolus (le relatif est appliqué dans la force finale)
  const wNat = useM22Sef ? P.V4_M22_W_NATIONAL  : P.V4_W_NATIONAL;
  const wNum = useM22Sef ? P.V4_M22_W_NUMERIQUE : P.V4_W_NUMERIQUE;

  const parts: { w: number; s: number }[] = [{ w: wNum, s: scoreNum }];
  if (scoreNat !== null) parts.push({ w: wNat, s: scoreNat });
  if (scoreSef !== null) parts.push({ w: P.V4_M22_W_SEF, s: scoreSef });

  const totalW = parts.reduce((t, p) => t + p.w, 0);
  return parts.reduce((t, p) => t + (p.w / totalW) * p.s, 0);
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
  // Plancher 0.5% pour éviter les cotes infinies, plafond 0.999 pour ne pas
  // bloquer les cotes à 1.15 (1.10/0.97) quand la prob est quasi-certaine
  return Math.min(Math.max(cumulativeNormal(z), 0.005), 0.999);
}

export function sigmaFor(rangEspere: number): number {
  const { SIGMA_FACTOR, SIGMA_MIN } = ALGO_PARAMS;
  return Math.max(SIGMA_MIN, SIGMA_FACTOR * Math.sqrt(rangEspere));
}

// v4 : conversion proba → cote, bornée [min, max] par type de pari.
// L'ancrage (min) fait qu'un favori évident tombe au plancher (Top1 ≈ 1.68).
export function probToCote(prob: number, min: number, max: number): number {
  const { MARGE } = ALGO_PARAMS;
  const raw  = MARGE / Math.max(prob, 1e-6);
  const cote = Math.min(Math.max(raw, min), max);
  return Math.round(cote / 0.05) * 0.05;  // arrondi au 0.05
}

// v4.2 — garde-fou : un athlète classé numériquement dans le top 10/20
// (rang_national ≤ 10 ou ≤ 20) est un favori réel — sa cote ne doit jamais
// dépasser le plafond correspondant, même si le calcul Bradley-Terry (dilué
// par des données de course faibles/absentes) produit un résultat plus haut.
// Appliqué en dernier recours, par-dessus le clamp [min, max] habituel.
export function capCoteByRangNumerique(cote: number, rangNational: number, cap10: number, cap20: number): number {
  if (rangNational <= 10) return Math.min(cote, cap10);
  if (rangNational <= 20) return Math.min(cote, cap20);
  return cote;
}

// Probabilité de finir EXACTEMENT à la place N (bande [N-0.5, N+0.5] de la loi
// normale du rang espéré). Sert au calcul dynamique de la cote "place exacte".
export function probExactPlace(rangEspere: number, sigma: number, place: number): number {
  const zHi = (place + 0.5 - rangEspere) / sigma;
  const zLo = (place - 0.5 - rangEspere) / sigma;
  const p = cumulativeNormal(zHi) - cumulativeNormal(zLo);
  return Math.min(Math.max(p, 0.005), 0.999);
}
