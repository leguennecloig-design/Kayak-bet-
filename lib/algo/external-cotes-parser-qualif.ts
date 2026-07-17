// Parse un fichier .txt de cotes "passage en finale" déjà calculées en
// externe — variante de external-cotes-parser.ts pour les compétitions
// QUALIF (manche de qualification avant une finale séparée). Un seul
// marché existe pour ce type de compétition : la probabilité que
// l'athlète se qualifie pour la finale (quota fixe par catégorie), pas de
// Top1/3/5/10 ni place/temps exact.
//
// Format attendu : un bloc d'en-tête (ignoré, sauf best-effort nom compét.),
// puis une section par catégorie :
//   -----...-----
//   <Libellé> (<CODE>) – N partant(s) – M qualifié(s) en finale – méthode : <texte>
//   -----...-----
//    Dos  Nom - Prénom   Club   Dép.   P(finale)   Cote      <- ligne d'en-tête colonnes
//    26   FOUROTTE Camille   ...   7/8   99.4%   1.01         <- une ligne par athlète/bateau
// Les 3 dernières colonnes (Dép. "N/M", P(finale) "XX.X%", Cote "N.NN") ont un
// format non ambigu et servent d'ancrage de fin de ligne — le nom/club au
// milieu est ensuite séparé par un padding d'espaces (≥ 2), comme dans
// external-cotes-parser.ts (même limite documentée pour les équipages dont
// le nom déborde et se retrouve collé au club sans séparateur).

import { fixMojibake } from "@/lib/parsers/mojibake";

export type QualifAthlete = {
  dossard: number;
  nom: string;
  club: string;
  cote_qualif_finale: number | null;
};

export type QualifCategory = {
  code: string;
  libelle: string;
  nb_partants: number;
  nb_qualifies: number;
  athletes: QualifAthlete[];
};

export type ParsedQualifCotes = {
  nom_competition: string;
  lieu: string;
  date_debut: string | null;
  date_fin: string | null;
  categories: QualifCategory[];
  stats: { total: number; categories: number };
  errors: string[];
};

const DASH_LINE_RE = /^[-=]{5,}$/;
// Volontairement sans capture du texte "méthode : ..." — un dash mojibake
// mal reconstruit (voir fixMojibake) juste avant peut casser l'ancrage sur
// le mot lui-même ; le texte de méthode n'a de toute façon pas besoin
// d'être stocké (la pop-up d'explication est un texte générique, pas par
// catégorie — voir OddsQualifInfoModal).
const CATEGORY_HEADER_RE = /^(.+?)\s*\(([A-Z][A-Z0-9]*)\)\s*.*?(\d+)\s*partant.*?(\d+)\s*qualifi/i;
const ROW_RE = /^(\d+)\s+(.*?)\s+(\d+\/\d+)\s+(\d+(?:[.,]\d+)?)\s*%\s+(\d+[.,]\d+)\s*$/;

function isCategoryHeader(line: string): { code: string; libelle: string; nbPartants: number; nbQualifies: number } | null {
  if (!/partant/i.test(line) || !/qualifi/i.test(line)) return null;
  const m = CATEGORY_HEADER_RE.exec(line);
  if (!m) return null;
  const libelle = m[1].trim();
  const code = m[2];
  if (!code || !libelle) return null;
  return {
    code,
    libelle,
    nbPartants: parseInt(m[3], 10),
    nbQualifies: parseInt(m[4], 10),
  };
}

function isColumnHeaderLine(line: string): boolean {
  return /\bDos\b/.test(line) && /P\s*\(\s*finale\s*\)/i.test(line);
}

type RowResult = { athlete: QualifAthlete | null; reason?: string };

// Même limite documentée que external-cotes-parser.ts::parseDataRow : un nom
// d'équipage qui déborde peut se retrouver collé au club SANS espace
// séparateur, avec une quantité de texte perdue imprévisible (parfois juste
// un point, parfois toute une initiale, parfois plusieurs lettres du nom).
// Reconstruire ce texte automatiquement serait deviner — risqué pour
// l'identité de l'athlète. Mais SUPPRIMER complètement la ligne perdait
// aussi le dossard et la cote (pourtant fiables), et empêchait ensuite
// TOUT rapprochement avec les résultats qualif, même pour le premier
// équipier (dont le nom, lui, est intact avant le " / "). On crée donc
// quand même le participant — avec le texte brut (non coupé) comme nom
// provisoire — et on le signale comme avertissement (pas un rejet) pour
// que l'admin corrige le nom affiché ensuite (voir EditClient.tsx, nom
// cliquable pour éditer).
function parseDataRow(line: string): RowResult {
  const m = ROW_RE.exec(line.trim());
  if (!m) return { athlete: null };

  const dossard = parseInt(m[1], 10);
  if (!Number.isInteger(dossard)) return { athlete: null };

  const middle = m[2].trim();
  const cote = parseFloat(m[5].replace(",", "."));
  const cote_qualif_finale = Number.isFinite(cote) ? cote : null;

  const parts = middle.split(/\s{2,}/).filter(Boolean);
  // "*" en fin de nom = marqueur "aucune donnée" (même convention que
  // external-cotes-parser.ts) — jamais utile dans le nom stocké, et casserait
  // sinon le rapprochement nom+initiale avec les résultats qualif plus tard.
  const nom = (parts[0] ?? middle).replace(/\s*\*\s*$/, "").trim();
  const club = parts.slice(1).join(" ").trim();

  if (!club && nom.includes(" / ")) {
    return {
      athlete: { dossard, nom, club: "", cote_qualif_finale },
      reason: `nom et club fusionnés (colonne "Nom" trop étroite dans le fichier source pour "${nom}") — participant créé avec ce nom provisoire, à corriger dans la startlist admin (le nom est cliquable)`,
    };
  }

  return { athlete: { dossard, nom, club, cote_qualif_finale } };
}

// Best-effort : premier intitulé du bandeau d'en-tête comme nom de
// compétition (ex: "KAYAKBET — COTES — PASSAGE EN FINALE — Championnat de
// France Sprint (AIME-LA-PLAGNE)" → dernier segment). Toujours à
// confirmer/corriger côté admin avant création — un échec ici n'empêche
// jamais l'import, seuls les champs restent vides.
function parseHeader(lines: string[]): { nom_competition: string; lieu: string; date_debut: string | null; date_fin: string | null } {
  let nom_competition = "";
  const lieu = "";
  const date_debut: string | null = null;
  const date_fin: string | null = null;

  const nonEmpty = lines.map(l => l.trim()).filter(l => l && !DASH_LINE_RE.test(l));
  if (nonEmpty.length === 0) return { nom_competition, lieu, date_debut, date_fin };

  const parts = nonEmpty[0].split(/\s[-–—]\s/).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) nom_competition = parts[parts.length - 1];

  return { nom_competition, lieu, date_debut, date_fin };
}

export function parseQualifCotesFile(content: string): ParsedQualifCotes {
  const lines = content.split(/\r?\n/).map(l => fixMojibake(l));
  const errors: string[] = [];

  const preambleEnd = lines.findIndex(l => isCategoryHeader(l.trim()) !== null);
  const header = parseHeader(lines.slice(0, preambleEnd === -1 ? lines.length : preambleEnd));

  const categories: QualifCategory[] = [];
  let current: QualifCategory | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (DASH_LINE_RE.test(line)) continue;

    const hdr = isCategoryHeader(line);
    if (hdr) {
      current = {
        code: hdr.code, libelle: hdr.libelle,
        nb_partants: hdr.nbPartants, nb_qualifies: hdr.nbQualifies,
        athletes: [],
      };
      categories.push(current);
      continue;
    }

    if (isColumnHeaderLine(line)) continue;
    if (!current) continue; // encore dans le bloc d'en-tête général

    const { athlete, reason } = parseDataRow(line);
    if (athlete) {
      current.athletes.push(athlete);
      if (reason) errors.push(`Ligne ${i + 1} dans "${current.libelle}" : ${reason}.`);
    } else if (reason) {
      errors.push(`Ligne ${i + 1} dans "${current.libelle}" : ${reason}.`);
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
