import { cumulativeNormal } from "./math-utils";
import type { AthleteInStartlist } from "./types";

export const ALGO_PARAMS = {
  K: 0.20,            // vitesse de décroissance des forces
  WEIGHT_RANG: 0.50,  // poids du rang national
  WEIGHT_PTS: 0.50,   // poids des points classement
  SIGMA_FACTOR: 0.65, // facteur d'incertitude
  MARGE: 1.10,        // marge bookmaker 10%
  COTE_MIN: 1.05,
  COTE_MAX: 100.0,
  ALGO_VERSION: "v1.0",
} as const;

export function calculerForce(
  athlete: AthleteInStartlist,
  allInStartlist: AthleteInStartlist[]
): number {
  const { K, WEIGHT_RANG, WEIGHT_PTS } = ALGO_PARAMS;

  const sortedByRang = [...allInStartlist].sort(
    (a, b) => a.rang_national - b.rang_national
  );
  const rangRelatif =
    sortedByRang.findIndex((a) => a.code_bateau === athlete.code_bateau) + 1;

  const sortedByPts = [...allInStartlist].sort(
    (a, b) => b.points_classement - a.points_classement // DESC : plus de points = meilleur
  );
  const ptsRelatif =
    sortedByPts.findIndex((a) => a.code_bateau === athlete.code_bateau) + 1;

  const forceRang = Math.exp(-K * (rangRelatif - 1));
  const forcePts  = Math.exp(-K * (ptsRelatif - 1));

  const fiabilite =
    athlete.nb_courses_classement >= 3 ? 1.0
    : athlete.nb_courses_classement === 2 ? 0.90
    : 0.80;

  return (WEIGHT_RANG * forceRang + WEIGHT_PTS * forcePts) * fiabilite;
}

export function calculerRangEspere(
  athlete: AthleteInStartlist,
  forces: Map<string, number>
): number {
  const fi = forces.get(athlete.code_bateau)!;
  let expected = 1;
  for (const [code, fj] of forces.entries()) {
    if (code !== athlete.code_bateau) {
      expected += fj / (fi + fj);
    }
  }
  return expected;
}

export function sigmaFor(expectedRank: number): number {
  return Math.max(0.8, ALGO_PARAMS.SIGMA_FACTOR * Math.sqrt(expectedRank));
}

export function probTopN(
  expectedRank: number,
  sigma: number,
  n: number
): number {
  const z = (n + 0.5 - expectedRank) / sigma;
  const prob = cumulativeNormal(z);
  return Math.min(Math.max(prob, 0.005), 0.97);
}

export function probToCote(prob: number): number {
  const { MARGE, COTE_MIN, COTE_MAX } = ALGO_PARAMS;
  const raw  = MARGE / prob;
  const cote = Math.min(Math.max(raw, COTE_MIN), COTE_MAX);
  return Math.round(cote / 0.05) * 0.05;
}
