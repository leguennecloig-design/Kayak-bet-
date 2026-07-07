// Algo Sprint Finale (v3-SF) : score = 60% résultats qualifs + 40% algo v3.
// Le score qualifs vient du fichier uploadé par l'admin (rang en qualifs →
// force par décroissance exponentielle) ; le score v3 vient de l'algo
// standard déjà en place, inchangé.

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

const POIDS_QUALIFS = 0.60;
const POIDS_V3 = 0.40;
const ALGO_VERSION = "v3-SF";

export async function calculateSprintFinaleCotes(
  courseId: string,
  categorie: string,
  qualifResults: ParsedResult[],
  supabase: SupabaseAny
): Promise<CoteResult[]> {

  // ── 1. Cotes v3 standard (40%) ────────────────────────────────────────────
  const cotesV3 = await calculateCotesForCourse(courseId, categorie, supabase);
  if (cotesV3.length === 0) return [];

  const scoresV3 = new Map(cotesV3.map((c) => [c.code_bateau, c.score_final]));

  // ── 2. Forces qualifs (60%) ────────────────────────────────────────────────
  const qualifsCat = qualifResults
    .filter((r) => r.categorie === categorie)
    .sort((a, b) => a.rang - b.rang);

  if (qualifsCat.length === 0) {
    // Pas de qualifs pour cette catégorie → fallback v3 pur
    return cotesV3.map((c) => ({ ...c, algo_version: `${ALGO_VERSION}_FALLBACK` }));
  }

  const K = ALGO_PARAMS.K_FORCE;
  const forcesQualifs = new Map<string, number>();
  qualifsCat.forEach((r, idx) => {
    forcesQualifs.set(r.code_bateau, Math.exp(-K * idx));
  });

  const totalQualifs = Array.from(forcesQualifs.values()).reduce((s, v) => s + v, 0);
  for (const [k, v] of forcesQualifs) forcesQualifs.set(k, v / totalQualifs);

  // ── 3. Normaliser les scores v3 ────────────────────────────────────────────
  const totalV3 = Array.from(scoresV3.values()).reduce((s, v) => s + v, 0);
  const scoresV3Norm = new Map<string, number>();
  for (const [k, v] of scoresV3) scoresV3Norm.set(k, v / totalV3);

  // ── 4. Combiner : 60% qualifs + 40% v3 ────────────────────────────────────
  const forcesCombinees = new Map<string, number>();
  const allCodes = new Set([...forcesQualifs.keys(), ...scoresV3Norm.keys()]);

  for (const code of allCodes) {
    const fQ = forcesQualifs.get(code) ?? 0;
    const fV = scoresV3Norm.get(code) ?? 0;

    // Absent des qualifs (ne devrait pas arriver en finale) → poids v3 dominant
    const poidsQualifsFinal = fQ > 0 ? POIDS_QUALIFS : 0.10;
    const poidsV3Final = fQ > 0 ? POIDS_V3 : 0.90;

    forcesCombinees.set(code, poidsQualifsFinal * fQ + poidsV3Final * fV);
  }

  // ── 5. Rang espéré + cotes ─────────────────────────────────────────────────
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

    const rangQualifs = qualifsCat.find((r) => r.code_bateau === code)?.rang ?? null;

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
      sources_utilisees: `QUALIFS(rang:${rangQualifs})+V3`,
    });
  }

  return results;
}
