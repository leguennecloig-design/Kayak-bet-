// Parser de résultats au format Markdown "nettoyé" (tableaux par catégorie,
// listes Abs/Abd/Dsq en texte libre) — alternative au parser PDF/TXT brut
// compétFFCK (resultats-pdf.ts) quand les résultats ont déjà été mis en forme
// en tableaux Markdown avant import (ex: fusion manuelle Officieux/Officiel).
//
// Structure attendue :
//   ### <Libellé catégorie> (<CODE>) — Officiel|Officieux [...]
//   | Clt | Dos | Nom - Prénom | Club | Temps | Écart |
//   |---|---|---|---|---|---|
//   | 1 | 292 | LUTINIER Elea | 1612 - ANGOULEME CANOE KAYAK | 16:14.73 | 00.00 |
//   ...
//   **Abs :** 277 SOLER Aude (CK CLUB DU MANS) • 279 ROY Faustine (CK VIVONNE)
//   **Abd :** 25 BIDAULT Yaelle. **Abs :** ...
//   **Dsq :** 366 DELEPLANCQUE Paul / GEORGE Esteban (VALLEE VONNE CK)
//
// Pour les biplaces (C2*), la colonne "Équipage" contient déjà "Nom1 / Nom2"
// tout formé — utilisé tel quel comme `nom`, pas de reconstruction nécessaire
// (contrairement au parser PDF où les deux équipiers sont sur des lignes séparées).
//
// Les séparateurs entre entrées Abs/Abd/Dsq (puce "•") sont parfois corrompus
// par du mojibake imprévisible selon l'outil source : plutôt que de dépendre
// du caractère exact, on repère directement le DÉBUT de chaque entrée
// ("<dossard> <Nom en majuscules>") et on découpe le texte entre deux débuts
// successifs, ce qui ignore silencieusement tout caractère parasite entre eux.

import { fixMojibake } from "./mojibake";
import type { ParsedResultat } from "./resultats-pdf";

const CATEGORY_HEADER_RE = /^#{1,4}\s*.*\(([A-Z][A-Z0-9]*)\)/;
const STATUS_MARKER_RE = /\*\*\s*(Abs|Abd|Dsq)\s*:?\s*\*\*/gi;
const STATUS_TO_FIELD: Record<string, "dns" | "dnf" | "dsq"> = {
  abs: "dns", abd: "dnf", dsq: "dsq",
};

function isTableRow(line: string): boolean {
  return line.startsWith("|") && line.endsWith("|");
}
function isSeparatorRow(line: string): boolean {
  return /^\|[\s:-]+\|$/.test(line);
}

function splitTableRow(line: string): string[] {
  return line.slice(1, -1).split("|").map(c => c.trim());
}

// Retrouve chaque entrée "<dossard> <Nom...> [(<club>)]" dans un segment de
// texte libre, quels que soient les caractères qui les séparent.
function parseAthleteList(segment: string): { dossard: number; nom: string; club: string | null }[] {
  const starts: { index: number; dossard: number; nameStart: number }[] = [];
  const startRe = /(\d+)\s+(?=\p{Lu})/gu;
  let m: RegExpExecArray | null;
  while ((m = startRe.exec(segment)) !== null) {
    starts.push({ index: m.index, dossard: parseInt(m[1], 10), nameStart: m.index + m[0].length });
  }

  const entries: { dossard: number; nom: string; club: string | null }[] = [];
  for (let i = 0; i < starts.length; i++) {
    const sliceEnd = i + 1 < starts.length ? starts[i + 1].index : segment.length;
    let raw = segment.slice(starts[i].nameStart, sliceEnd).trim();
    raw = raw.replace(/\.\s*$/, ""); // point final avant le prochain statut/fin de ligne

    const parenMatch = /^(.*?)\(([^)]*)\)/.exec(raw);
    let nom: string;
    let club: string | null;
    if (parenMatch) {
      nom = parenMatch[1].trim();
      club = parenMatch[2].trim() || null;
    } else {
      // Pas de club entre parenthèses : retire un éventuel résidu de puce
      // (mojibake, parfois partiellement reconstruite en une seule lettre
      // isolée comme "â") en fin de chaîne plutôt que de le garder dans le
      // nom. Les noms de ce format n'ont jamais de jeton final d'une seule
      // lettre (toujours "NOM Prénom" en entier), donc en retirer un est
      // sûr : ça ne peut être qu'un résidu de séparateur, jamais une vraie
      // initiale ou particule.
      nom = raw
        .replace(/[^\p{L}0-9'\-./\s]+$/gu, "")
        .replace(/\s+\p{L}$/u, "")
        .trim();
      club = null;
    }
    if (nom) entries.push({ dossard: starts[i].dossard, nom, club });
  }
  return entries;
}

function parseStatusLine(line: string): { field: "dns" | "dnf" | "dsq"; entries: ReturnType<typeof parseAthleteList> }[] {
  const markers: { field: "dns" | "dnf" | "dsq"; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(STATUS_MARKER_RE.source, "gi");
  while ((m = re.exec(line)) !== null) {
    markers.push({ field: STATUS_TO_FIELD[m[1].toLowerCase()], start: m.index, end: m.index + m[0].length });
  }
  return markers.map((marker, i) => {
    const segEnd = i + 1 < markers.length ? markers[i + 1].start : line.length;
    return { field: marker.field, entries: parseAthleteList(line.slice(marker.end, segEnd)) };
  });
}

export function parseResultatsMarkdown(rawText: string): ParsedResultat[] {
  const lines = rawText.split("\n").map(l => fixMojibake(l.trim())).filter(Boolean);

  const results: ParsedResultat[] = [];
  let currentCategorie = "";

  for (const line of lines) {
    const catMatch = CATEGORY_HEADER_RE.exec(line);
    if (catMatch) {
      currentCategorie = catMatch[1];
      continue;
    }

    if (!currentCategorie) continue;

    if (isTableRow(line)) {
      const cells = splitTableRow(line);
      if (cells[0]?.toLowerCase() === "clt" || isSeparatorRow(line)) {
        continue;
      }
      const [rangCell, dossardCell, nomCell, clubCell, tempsCell] = cells;
      const rang = /^\d+$/.test(rangCell) ? parseInt(rangCell, 10) : null;
      const dossard = /^\d+$/.test(dossardCell) ? parseInt(dossardCell, 10) : null;
      const nom = (nomCell ?? "").trim();
      if (dossard !== null && nom) {
        results.push({
          categorie: currentCategorie,
          rang,
          dossard,
          nom,
          club:  (clubCell ?? "").trim() || null,
          temps: (tempsCell ?? "").trim() || null,
          points: null,
          dns: false, dnf: false, dsq: false,
        });
      }
      continue;
    }

    if (STATUS_MARKER_RE.test(line)) {
      STATUS_MARKER_RE.lastIndex = 0;
      for (const { field, entries } of parseStatusLine(line)) {
        for (const e of entries) {
          results.push({
            categorie: currentCategorie,
            rang: null,
            dossard: e.dossard,
            nom: e.nom,
            club: e.club,
            temps: null,
            points: null,
            dns: field === "dns",
            dnf: field === "dnf",
            dsq: field === "dsq",
          });
        }
      }
    }
  }

  return results.filter(r => r.nom.trim() !== "");
}

// Détection heuristique du format : présence d'une ligne d'en-tête de
// tableau Markdown "| Clt | ... |" — utilisée par la route d'import pour
// choisir ce parser plutôt que le parser texte brut compétFFCK, quelle que
// soit l'extension du fichier envoyé (.md, ou .txt si exporté ainsi).
export function looksLikeMarkdownResultats(rawText: string): boolean {
  return /\|\s*Clt\s*\|/i.test(rawText);
}
