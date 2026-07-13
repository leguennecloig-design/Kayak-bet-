// Parse un fichier .txt de cotes déjà calculées en externe (format "KAYAKBET —
// COTES V4"), pour créer une compétition + startlist + cotes en un seul import,
// sans repasser par le moteur Bradley-Terry interne.
//
// Format attendu : un bloc d'en-tête (ignoré, sauf best-effort pour nom/lieu/
// dates), puis une section par catégorie :
//   -----...-----
//   <Libellé catégorie> (<CODE>) – N partant(s)
//   -----...-----
//    Dos  Nom - Prénom   Club   T1   T3   T5   T10      <- ligne d'en-tête colonnes
//    21   DUPRAT Maud    ...    30   15.27  3.85  N/D    <- une ligne par athlète/bateau
// Les colonnes sont alignées par un padding d'espaces (≥ 2) — le split sur
// /\s{2,}/ est donc robuste même si les accents sont mal encodés (la casse des
// espaces de padding n'est jamais affectée par un problème d'encodage texte).

export type ExternalCoteAthlete = {
  dossard: number;
  nom: string;
  club: string;
  cote_top1: number | null;
  cote_top3: number | null;
  cote_top5: number | null;
  cote_top10: number | null;
  noData: boolean; // '*' après le nom = aucune donnée FFCK trouvée (souvent étranger)
};

export type ExternalCoteCategory = {
  code: string;
  libelle: string;
  athletes: ExternalCoteAthlete[];
};

export type ParsedExternalCotes = {
  nom_competition: string;
  lieu: string;
  date_debut: string | null; // ISO (YYYY-MM-DD)
  date_fin: string | null;
  categories: ExternalCoteCategory[];
  stats: { total: number; categories: number };
  errors: string[];
};

const DASH_LINE_RE = /^[-=]{5,}$/;

function isCategoryHeader(line: string): { code: string; libelle: string } | null {
  if (!/partant/i.test(line)) return null;
  const m = line.match(/\(([A-Za-z0-9]+)\)/);
  if (!m || m.index === undefined) return null;
  const code = m[1];
  const libelle = line.slice(0, m.index).trim();
  if (!code || !libelle) return null;
  return { code, libelle };
}

function isColumnHeaderLine(line: string): boolean {
  return /\bDos\b/.test(line) && /\bT1\b/.test(line);
}

function parseValue(raw: string): number | null {
  if (/^n\/?d$/i.test(raw)) return null;
  const n = parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseDataRow(line: string): ExternalCoteAthlete | null {
  const fields = line.trim().split(/\s{2,}/).filter(Boolean);
  if (fields.length < 6) return null; // dossard + nom + club + au moins 3 valeurs

  const dossard = parseInt(fields[0], 10);
  if (!Number.isInteger(dossard)) return null;

  const values = fields.slice(-4);
  const [t1, t3, t5, t10] = values.map(parseValue);

  const rawName = fields[1];
  const isAnon = rawName.trim() === "*";
  const noData = /\*\s*$/.test(rawName) && !isAnon;
  const nom = isAnon ? `Équipage n°${dossard}` : rawName.replace(/\s*\*\s*$/, "").trim();

  const club = fields.slice(2, fields.length - 4).join(" ").trim();

  return { dossard, nom, club, cote_top1: t1, cote_top3: t3, cote_top5: t5, cote_top10: t10, noData };
}

// Best-effort : extrait nom/lieu/dates du bloc d'en-tête. Toujours à confirmer/
// corriger côté admin avant création (comme pour l'import PDF existant) — un
// échec de parsing ici n'empêche jamais l'import, seuls les champs restent vides.
function parseHeader(lines: string[]): { nom_competition: string; lieu: string; date_debut: string | null; date_fin: string | null } {
  let nom_competition = "";
  let lieu = "";
  let date_debut: string | null = null;
  let date_fin: string | null = null;

  const nonEmpty = lines.map(l => l.trim()).filter(l => l && !DASH_LINE_RE.test(l));
  if (nonEmpty.length === 0) return { nom_competition, lieu, date_debut, date_fin };

  // Ligne 1 (une seule tentative) : "KAYAKBET - COTES V4 (test) - <Nom compétition>"
  const parts = nonEmpty[0].split(/\s[-–—]\s/).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) nom_competition = parts[parts.length - 1];

  // Lignes suivantes : cherche "<Lieu>, JJ-JJ/MM/AAAA" ou "<Lieu>, JJ/MM/AAAA"
  for (const line of nonEmpty.slice(1)) {
    const range = line.match(/^(.+?),\s*(\d{1,2})-(\d{1,2})\/(\d{2})\/(\d{4})\s*$/);
    if (range) {
      const [, l, d1, d2, mo, yr] = range;
      lieu = l.trim();
      const pad = (n: string) => n.padStart(2, "0");
      date_debut = `${yr}-${pad(mo)}-${pad(d1)}`;
      date_fin = `${yr}-${pad(mo)}-${pad(d2)}`;
      break;
    }
    const single = line.match(/^(.+?),\s*(\d{1,2})\/(\d{2})\/(\d{4})\s*$/);
    if (single) {
      const [, l, d, mo, yr] = single;
      lieu = l.trim();
      const pad = (n: string) => n.padStart(2, "0");
      date_debut = `${yr}-${pad(mo)}-${pad(d)}`;
      date_fin = date_debut;
      break;
    }
  }

  return { nom_competition, lieu, date_debut, date_fin };
}

export function parseExternalCotesFile(content: string): ParsedExternalCotes {
  const lines = content.split(/\r?\n/);
  const errors: string[] = [];

  const preambleEnd = lines.findIndex(l => isCategoryHeader(l.trim()) !== null);
  const header = parseHeader(lines.slice(0, preambleEnd === -1 ? lines.length : preambleEnd));

  const categories: ExternalCoteCategory[] = [];
  let current: ExternalCoteCategory | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (DASH_LINE_RE.test(line)) continue;

    const hdr = isCategoryHeader(line);
    if (hdr) {
      current = { code: hdr.code, libelle: hdr.libelle, athletes: [] };
      categories.push(current);
      continue;
    }

    if (isColumnHeaderLine(line)) continue;

    if (!current) continue; // encore dans le bloc d'en-tête général

    const row = parseDataRow(line);
    if (row) {
      current.athletes.push(row);
    } else {
      errors.push(`Ligne ${i + 1} non reconnue dans "${current.libelle}" : "${lines[i].slice(0, 80)}"`);
    }
  }

  const nonEmptyCategories = categories.filter(c => c.athletes.length > 0);
  const total = nonEmptyCategories.reduce((s, c) => s + c.athletes.length, 0);

  return {
    nom_competition: header.nom_competition,
    lieu: header.lieu,
    date_debut: header.date_debut,
    date_fin: header.date_fin,
    categories: nonEmptyCategories,
    stats: { total, categories: nonEmptyCategories.length },
    errors,
  };
}
