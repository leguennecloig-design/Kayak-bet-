// Scraper FFCK Inscriptions — Descente uniquement.
//
// Structure HTML confirmée sur les vraies URLs (02/07/2026) :
//
// ajax_competition_load.php?activite[]=DES&page=500 :
//   tbody > tr × N, chaque tr contient 9 td :
//   [0] code FFCK (lien), [1] état (img), [2] D.Début DD/MM/YYYY, [3] D.Fin,
//   [4] Nom (lien), [5] D.Clôture, [6] Ville (CP+ville ou vide), [7] Act., [8] Niv.
//
// participant.php?code={code} :
//   tbody > tr × N, chaque tr contient 8 td :
//   [0] code_bateau <p>, [1] nom <p>, [2] épreuve <p> (K1HM/K1DM/K1HU18…),
//   [3] N°Club <p>, [4] Club <p>, [5] Lic.2026 <p> OUI/NON,
//   [6] C.Médical <p> OUI/NON, [7] Pagaie C. <p> code pagaie
//
// Pas de colonne "sexe" : dérivé du code épreuve (H/D en 3e position de la séquence
// après le type bateau : K1[H]M, K1[D]U18, C2[H]U18…).

import { FFCK_SCRAPER_CONFIG } from './ffck-config';

export type FFCKCompetitionListItem = {
  ffckCode: number;
  nom: string;
  ville: string;
  dateDebut: string; // ISO YYYY-MM-DD
  dateFin: string;   // ISO YYYY-MM-DD
  niveau: string;
};

export type FFCKParticipant = {
  codeBateau: string;
  nom: string;
  epreuve: string | null;      // code brut: K1HM, K1DU18, C2HU18…
  sexe: string | null;         // dérivé: 'H' | 'D'
  club: string | null;
  numeroClub: string | null;
  licenceValide: boolean | null;
  pagaieCouleur: string | null;
};

export type MatchResult =
  | { status: 'matche_auto'; ffckCode: number; confidence: number }
  | { status: 'ambigu'; candidates: FFCKCompetitionListItem[] }
  | { status: 'introuvable' };

// ---------------------------------------------------------------------------
// Helpers HTML
// ---------------------------------------------------------------------------

function extractText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTdCells(rowHtml: string): string[] {
  const cells: string[] = [];
  const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rowHtml)) !== null) {
    cells.push(extractText(m[1]));
  }
  return cells;
}

// Extrait les lignes <tr> du premier <tbody> de l'HTML
function extractBodyRows(html: string): string[] {
  const tbodyMatch = /<tbody>([\s\S]*?)<\/tbody>/i.exec(html);
  if (!tbodyMatch) return [];
  const tbody = tbodyMatch[1];
  const rows: string[] = [];
  const re = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tbody)) !== null) {
    rows.push(m[1]);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Helpers dates
// ---------------------------------------------------------------------------

// DD/MM/YYYY → YYYY-MM-DD (retourne null si invalide)
function parseFrDate(s: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// ---------------------------------------------------------------------------
// Helpers matching
// ---------------------------------------------------------------------------

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // supprime les diacritiques
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Retire le code postal (5 chiffres en début) de la ville FFCK
// ex: "73210 AIME-LA-PLAGNE" → "AIME-LA-PLAGNE"
function extractCityFromVille(ville: string): string {
  return ville.replace(/^\d{5}\s+/, '').trim();
}

// Distance de Levenshtein (implémentation itérative, sans dépendance)
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const curr = a[i - 1] === b[j - 1]
        ? dp[j - 1]
        : 1 + Math.min(dp[j - 1], dp[j], prev);
      dp[j - 1] = prev;
      prev = curr;
    }
    dp[n] = prev;
  }
  return dp[n];
}

// Similarité 0–1 entre deux chaînes normalisées
function stringSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const na = normalizeStr(a), nb = normalizeStr(b);
  if (na === nb) return 1;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

// ---------------------------------------------------------------------------
// Fetch utilitaire
// ---------------------------------------------------------------------------

async function fetchFFCK(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FFCK_SCRAPER_CONFIG.FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': FFCK_SCRAPER_CONFIG.USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

// Dérive le sexe ('H' | 'D') depuis le code épreuve FFCK
// Exemples : K1HM → H, K1DU18 → D, C2HU18 → H, C1DM22 → D
function deriveSexe(epreuve: string | null): string | null {
  if (!epreuve) return null;
  // Après le type bateau (K1/C1/C2 = 2 chars), le 3e char est H ou D
  const char = epreuve.length >= 3 ? epreuve[2].toUpperCase() : null;
  if (char === 'H' || char === 'D') return char;
  return null;
}

/**
 * Scrape la liste des compétitions Descente depuis l'endpoint AJAX FFCK.
 * Utilise ajax_competition_load.php directement avec activite[]=DES&page=500
 * pour obtenir toutes les compétitions en une seule requête sans pagination JS.
 */
export async function fetchInscriptionsList(): Promise<FFCKCompetitionListItem[]> {
  // Construction manuelle de l'URL pour préserver la notation PHP activite[]=DES
  const url = `${FFCK_SCRAPER_CONFIG.AJAX_COMPETITION_URL}?activite%5B%5D=${FFCK_SCRAPER_CONFIG.DISCIPLINE_FILTER}&page=500`;
  const html = await fetchFFCK(url);
  return parseCompetitionList(html);
}

function parseCompetitionList(html: string): FFCKCompetitionListItem[] {
  const rows = extractBodyRows(html);
  const results: FFCKCompetitionListItem[] = [];

  for (const row of rows) {
    const cells = extractTdCells(row);
    if (cells.length < 9) continue;

    // Cell 0 : code FFCK (ex: "7863")
    const codeMatch = /code=(\d+)/.exec(row);
    if (!codeMatch) continue;
    const ffckCode = parseInt(codeMatch[1], 10);

    // Cell 7 : activité — on ne garde que DES (redondant avec le filtre mais sécurité)
    const activite = cells[7];
    if (activite !== FFCK_SCRAPER_CONFIG.DISCIPLINE_FILTER) continue;

    const dateDebut = parseFrDate(cells[2]);
    const dateFin   = parseFrDate(cells[3]);
    if (!dateDebut) continue;

    results.push({
      ffckCode,
      nom:       cells[4],
      ville:     cells[6],
      dateDebut,
      dateFin:   dateFin ?? dateDebut,
      niveau:    cells[8],
    });
  }

  return results;
}

/**
 * Scrape la liste des partants d'une compétition via participant.php?code={ffckCode}.
 * Retourne un tableau vide si la page ne contient aucun participant (ou est vide/erreur).
 */
export async function fetchParticipants(ffckCode: number): Promise<FFCKParticipant[]> {
  const url = `${FFCK_SCRAPER_CONFIG.BASE_URL}/participant.php?code=${ffckCode}`;
  let html: string;
  try {
    html = await fetchFFCK(url);
  } catch {
    return [];
  }
  return parseParticipants(html);
}

function parseParticipants(html: string): FFCKParticipant[] {
  // Trouver le tbody principal de la table des participants (id="table_ins")
  // On cherche le premier tbody après "table_ins"
  const tableMatch = /<table[^>]+id="table_ins"[^>]*>([\s\S]*?)<\/table>/i.exec(html);
  if (!tableMatch) return [];

  const tableHtml = tableMatch[1];
  const rows = extractBodyRows(`<tbody>${tableHtml.split(/<\/thead>/i)[1] ?? tableHtml}</tbody>`);

  // Fallback : si le tbody n'est pas dans la table isolée, chercher le tbody global
  const effectiveRows = rows.length > 0 ? rows : extractBodyRows(html);

  const results: FFCKParticipant[] = [];

  for (const row of effectiveRows) {
    const cells = extractTdCells(row);
    if (cells.length < 6) continue;

    const codeBateau = cells[0];
    if (!codeBateau || !/^[KC][12][A-Z]/.test(codeBateau)) continue; // filtre les lignes header

    const epreuve = cells[2] || null;
    const licRaw  = cells[5].toUpperCase();
    // Licence peut être "OUI/OUI" pour les biplaces
    const licenceValide = licRaw ? licRaw.startsWith('OUI') : null;

    // Pagaie : extraire le code texte après les images (PAGBL, PAGN, PAGV…)
    // La cellule contient "&nbsp;<img...>PAGBL" — extractText supprime déjà les tags
    const pagaieRaw = cells[7].replace(/PAG/i, 'PAG');
    const pagaieMatch = /PAG[A-Z]+/.exec(pagaieRaw);
    const pagaieCouleur = pagaieMatch ? pagaieMatch[0] : (cells[7] || null);

    results.push({
      codeBateau,
      nom:           cells[1],
      epreuve,
      sexe:          deriveSexe(epreuve),
      club:          cells[4] || null,
      numeroClub:    cells[3] || null,
      licenceValide,
      pagaieCouleur: pagaieCouleur || null,
    });
  }

  return results;
}

/**
 * Tente de faire correspondre une compétition Kayakbet à une compétition FFCK.
 *
 * Algorithme :
 * 1. Filtre par date : notre `date` doit tomber dans l'intervalle
 *    [ffck.dateDebut − tolerance, ffck.dateFin + tolerance].
 * 2. Parmi les candidats restants, calcule une confiance = moyenne(sim_ville, sim_nom).
 * 3. Si un seul candidat avec confiance ≥ MATCH_MIN_CONFIDENCE → auto-match.
 * 4. Si plusieurs candidats passent le filtre date → ambigu.
 * 5. Sinon → introuvable.
 */
export function matchCompetitionToFFCK(
  competition: { nom: string; lieu: string | null; date: string | null },
  ffckList: FFCKCompetitionListItem[],
): MatchResult {
  if (!competition.date) return { status: 'introuvable' };

  const ourDate = new Date(competition.date);
  const tol = FFCK_SCRAPER_CONFIG.MATCH_DATE_TOLERANCE_DAYS * 24 * 60 * 60 * 1000;

  // Étape 1 : filtre par plage de dates
  const dateMatches = ffckList.filter(item => {
    const debut = new Date(item.dateDebut).getTime();
    const fin   = new Date(item.dateFin).getTime();
    const t     = ourDate.getTime();
    return t >= debut - tol && t <= fin + tol;
  });

  if (dateMatches.length === 0) return { status: 'introuvable' };

  // Étape 2 : confiance sur ville + nom
  const ourVille = normalizeStr(competition.lieu ?? '');
  const ourNom   = normalizeStr(competition.nom);

  const scored = dateMatches.map(item => {
    const ffckVille = normalizeStr(extractCityFromVille(item.ville));
    const ffckNom   = normalizeStr(item.nom);

    const simVille = ourVille ? stringSimilarity(ourVille, ffckVille) : 0.5;
    const simNom   = stringSimilarity(ourNom, ffckNom);
    // La ville est le signal le plus fiable
    const confidence = ourVille ? (simVille * 0.6 + simNom * 0.4) : simNom;

    return { item, confidence };
  });

  scored.sort((a, b) => b.confidence - a.confidence);

  const best = scored[0];
  const MIN = FFCK_SCRAPER_CONFIG.MATCH_MIN_CONFIDENCE;

  if (best.confidence >= MIN) {
    // Vérifier qu'il n'y a pas d'ambiguïté : le 2e candidat ne doit pas être trop proche
    const second = scored[1];
    if (second && second.confidence >= MIN * 0.9 && best.confidence - second.confidence < 0.1) {
      // Deux candidats quasi-égaux → ambigu
      return {
        status: 'ambigu',
        candidates: scored.filter(s => s.confidence >= MIN * 0.8).map(s => s.item),
      };
    }
    return { status: 'matche_auto', ffckCode: best.item.ffckCode, confidence: best.confidence };
  }

  // Confiance insuffisante mais des candidats existent par date → ambigu
  if (dateMatches.length >= 1) {
    return { status: 'ambigu', candidates: dateMatches };
  }

  return { status: 'introuvable' };
}

export { sleep };
