// Algo Mass Start (v3-MS) : score = 80% résultats classique du week-end +
// 20% algo v3. Même structure que Sprint Finale, poids inversés et K un peu
// plus faible (la classique a davantage de dispersion que des qualifs sprint).

import { calculateCotesForCourse } from "./cotes-engine";
import {
  probTopN,
  probToCote,
  plafondTop1,
  sigmaFor,
  ALGO_PARAMS,
} from "./bradley-terry";
import type { ParsedResult } from "./result-parser";
import type { CoteResult } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

const POIDS_CLASSIQUE = 0.80;
const POIDS_V3 = 0.20;
const ALGO_VERSION = "v3-MS";

export async function calculateMassStartCotes(
  courseId: string,
  categorie: string,
  classiqueResults: ParsedResult[],
  supabase: SupabaseAny
): Promise<CoteResult[]> {

  // ── 1. Cotes v3 standard (20%) ────────────────────────────────────────────
  const cotesV3 = await calculateCotesForCourse(courseId, categorie, supabase);
  if (cotesV3.length === 0) return [];

  return combineMassStart(cotesV3, classiqueResults, categorie);
}

// Combine des cotes v3 déjà calculées (peu importe leur origine — course_id ou
// competition_id) avec les résultats de la classique uploadés par l'admin.
export function combineMassStart(
  cotesV3: CoteResult[],
  classiqueResults: ParsedResult[],
  categorie: string
): CoteResult[] {
  const scoresV3 = new Map(cotesV3.map((c) => [c.code_bateau, c.score_final]));

  // ── 2. Forces classique du WE (80%) ────────────────────────────────────────
  const classiqueCat = classiqueResults
    .filter((r) => r.categorie === categorie)
    .sort((a, b) => a.rang - b.rang);

  if (classiqueCat.length === 0) {
    return cotesV3.map((c) => ({ ...c, algo_version: `${ALGO_VERSION}_FALLBACK` }));
  }

  // K plus faible qu'en sprint : la classique a plus de dispersion
  const K = ALGO_PARAMS.K_FORCE * 0.85;
  const forcesClassique = new Map<string, number>();
  classiqueCat.forEach((r, idx) => {
    forcesClassique.set(r.code_bateau, Math.exp(-K * idx));
  });

  const totalCl = Array.from(forcesClassique.values()).reduce((s, v) => s + v, 0);
  for (const [k, v] of forcesClassique) forcesClassique.set(k, v / totalCl);

  const totalV3 = Array.from(scoresV3.values()).reduce((s, v) => s + v, 0);
  const scoresV3Norm = new Map<string, number>();
  for (const [k, v] of scoresV3) scoresV3Norm.set(k, v / totalV3);

  // ── 3. Combiner : 80% classique WE + 20% v3 ───────────────────────────────
  const forcesCombinees = new Map<string, number>();
  const allCodes = new Set([...forcesClassique.keys(), ...scoresV3Norm.keys()]);

  for (const code of allCodes) {
    const fC = forcesClassique.get(code) ?? 0;
    const fV = scoresV3Norm.get(code) ?? 0;

    // Absent de la classique → forte incertitude, poids v3 dominant
    const poidsClassiqueFinal = fC > 0 ? POIDS_CLASSIQUE : 0.15;
    const poidsV3Final = fC > 0 ? POIDS_V3 : 0.85;

    forcesCombinees.set(code, poidsClassiqueFinal * fC + poidsV3Final * fV);
  }

  // ── 4. Rang espéré + cotes ─────────────────────────────────────────────────
  const results: CoteResult[] = [];

  for (const coteV3 of cotesV3) {
    const code = coteV3.code_bateau;
    const fi = forcesCombinees.get(code);
    if (fi === undefined) continue;

    let rangEspere = 1;
    for (const [c, fj] of forcesCombinees) {
      if (c !== code) rangEspere += fj / (fi + fj);
    }

    const sigma = sigmaFor(rangEspere);

    const p1 = probTopN(rangEspere, sigma, 1);
    const p3 = probTopN(rangEspere, sigma, 3);
    const p5 = probTopN(rangEspere, sigma, 5);
    const p10 = probTopN(rangEspere, sigma, 10);
    const p20 = probTopN(rangEspere, sigma, 20);

    const rangClassique = classiqueCat.find((r) => r.code_bateau === code)?.rang ?? null;

    results.push({
      ...coteV3,
      score_final: fi,
      rang_espere: rangEspere,
      sigma,
      prob_top1: p1, cote_top1: probToCote(p1, plafondTop1(coteV3.rang_national)),
      prob_top3: p3, cote_top3: probToCote(p3, ALGO_PARAMS.PLAFOND_TOP3),
      prob_top5: p5, cote_top5: probToCote(p5, ALGO_PARAMS.PLAFOND_TOP5),
      prob_top10: p10, cote_top10: probToCote(p10, ALGO_PARAMS.PLAFOND_TOP10),
      prob_top20: p20, cote_top20: probToCote(p20, ALGO_PARAMS.PLAFOND_TOP20),
      algo_version: ALGO_VERSION,
      sources_utilisees: `CLASSIQUE_WE(rang:${rangClassique})+V3`,
    });
  }

  return results;
}
