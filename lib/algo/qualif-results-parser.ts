// Parse la liste des qualifiés en finale pour une compétition QUALIF (voir
// competitions.marche_qualif_finale) — format volontairement minimal : juste
// les noms, pas de rang/temps/club (contrairement à un import de résultats
// normal, voir lib/parsers/resultats-markdown.ts). Un athlète du départ non
// listé en "Qualifiés" est automatiquement considéré non qualifié (perdu) ;
// seul "Abs" le neutralise (void, voir close/route.ts).
//
// Format attendu, une section par catégorie :
//   ### <Libellé> (<CODE>)
//   Qualifiés :
//   NOM Prénom
//   NOM Prénom
//   ...
//
//   Abs : NOM Prénom, NOM Prénom

import { fixMojibake } from "@/lib/parsers/mojibake";

export type QualifResultsCategory = {
  code: string;
  qualifies: string[]; // noms tels qu'écrits dans le fichier (comparaison normalisée à l'import)
  abs: string[];
};

export type ParsedQualifResults = {
  categories: QualifResultsCategory[];
  errors: string[];
};

const CATEGORY_HEADER_RE = /^#{1,4}\s*.*\(([A-Z][A-Z0-9]*)\)/;
const QUALIFIES_MARKER_RE = /^qualifi[ée]?s?\s*:?\s*$/i;
const ABS_MARKER_RE = /^abs\s*:\s*(.*)$/i;

function splitNames(raw: string): string[] {
  return raw.split(/[,•]/).map(s => s.trim()).filter(Boolean);
}

export function parseQualifResults(content: string): ParsedQualifResults {
  const lines = content.split(/\r?\n/).map(l => fixMojibake(l.trim()));
  const errors: string[] = [];
  const categories: QualifResultsCategory[] = [];

  let current: QualifResultsCategory | null = null;
  let collectingQualifies = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const hdr = CATEGORY_HEADER_RE.exec(line);
    if (hdr) {
      current = { code: hdr[1], qualifies: [], abs: [] };
      categories.push(current);
      collectingQualifies = false;
      continue;
    }

    if (!current) continue;

    if (QUALIFIES_MARKER_RE.test(line)) {
      collectingQualifies = true;
      continue;
    }

    const absMatch = ABS_MARKER_RE.exec(line);
    if (absMatch) {
      current.abs.push(...splitNames(absMatch[1]));
      collectingQualifies = false;
      continue;
    }

    if (collectingQualifies) {
      current.qualifies.push(line.replace(/^[-•]\s*/, "").trim());
      continue;
    }

    errors.push(`Ligne ${i + 1} non reconnue${current ? ` dans "${current.code}"` : ""} : "${line.slice(0, 80)}"`);
  }

  return { categories: categories.filter(c => c.qualifies.length > 0 || c.abs.length > 0), errors };
}
