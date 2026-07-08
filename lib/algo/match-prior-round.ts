// Convertit les résultats d'une manche précédente (classique pour le mass
// start, sprint normal/qualifs pour la sprint finale — même format PDF/TXT
// que l'import de résultats de compétition) en pseudo-résultats compatibles
// avec les moteurs combine{SprintFinale,MassStart} : ceux-ci matchent par
// code_bateau + categorie, alors qu'un fichier de manche précédente n'a que
// le nom de l'athlète. On résout donc le code_bateau via un matching par nom
// normalisé sur les cotes déjà calculées (elles-mêmes scopées à l'épreuve).

import { normalizeName } from "@/lib/startlist/parse";
import type { ParsedResultat } from "@/lib/parsers/resultats-pdf";
import type { ParsedResult } from "./result-parser";
import type { CoteResult } from "./types";

export function matchPriorRoundToCodeBateau(
  cotesV3: CoteResult[],
  priorRoundResults: ParsedResultat[]
): ParsedResult[] {
  const rangByName = new Map<string, number>();
  for (const r of priorRoundResults) {
    if (r.rang == null) continue; // ignore Abs/Abd — pas de rang exploitable
    rangByName.set(normalizeName(r.nom), r.rang);
  }

  const matched: ParsedResult[] = [];
  for (const c of cotesV3) {
    const rang = rangByName.get(normalizeName(c.nom));
    if (rang != null) {
      matched.push({ rang, code_bateau: c.code_bateau, categorie: c.categorie });
    }
  }
  return matched;
}
