// Parser de résultats compétition FFCK (format competFFCK v6.x)
//
// Structure PDF :
//   En-tête : nom compétition, lieu, dates
//   Par catégorie :
//     Header : "Canoë monoplace homme M22 (C1HM22)" ou "Kayak dame U18 (K1DU18)"
//     Colonnes : Clt | Dos | Nom - Prénom | Club | Tps M1 | Tps M2 | Meil Tps | Ecart | Point
//     Monoplace : une ligne par athlète
//     Biplace (C2) : nom du 1er équipier, puis ligne rang/dossard/club/temps,
//                    puis nom du 2e équipier (3 lignes par bateau)
//
// Stratégie :
//   - Réparer l'encodage mojibake éventuel (UTF-8 relu en Windows-1252) avant tout parsing
//   - Détecter les headers de catégorie par le code entre parenthèses
//   - Chercher le code club (XXXX - ) dans chaque ligne pour identifier les lignes athlètes
//   - Pour les biplaces, mémoriser le nom qui précède la ligne de données et
//     consommer par anticipation celui qui la suit

// Table de correspondance Windows-1252 pour la plage 0x80-0x9F (au-delà,
// Latin-1 et Windows-1252 coïncident avec Unicode).
const CP1252_HIGH: Record<number, number> = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F,
};

// Répare le mojibake classique "UTF-8 relu comme Windows-1252" (ex: "Ã©" → "é").
// Se déclenche uniquement si le motif est détecté, et abandonne proprement
// (retourne le texte d'origine) si la reconstruction échoue — jamais de risque
// de corrompre un texte déjà correctement encodé.
function fixMojibake(text: string): string {
  if (!/Ã./.test(text)) return text;
  const bytes: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp <= 0xFF) { bytes.push(cp); continue; }
    const mapped = CP1252_HIGH[cp];
    if (mapped == null) return text; // caractère non mappable -> pas du mojibake CP1252
    bytes.push(mapped);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
  } catch {
    return text;
  }
}

export interface ParsedResultat {
  categorie:  string;
  rang:       number | null;   // null = DNS/DNF
  dossard:    number | null;
  nom:        string;
  club:       string | null;
  temps:      string | null;   // meilleur temps ex: "1:21.63"
  points:     number | null;
  dns:        boolean;         // Absent = did not start
  dnf:        boolean;         // Abandonné = did not finish
  dsq:        boolean;         // Disqualifié
}

// Lignes à ignorer systématiquement
const SKIP_RE = [
  /^Clt\s+Dos\s+Nom/i,
  /^competFFCK/i,
  /^Édit|^Edité le/i,
  /^Juge Arbitre/i,
  /^R1\s*:|^Informatique\s*:|^R\d\s*:/i,
  /^Page\s+\d+/i,
  /^\d{2}\/\d{2}\/\d{4}\s*[-–]\s*Manche/i,
  /^Sélectif|^Résultats Officiels|^Du \d{2}/i,
  /^\d{5}\s+[A-ZÉÀÈÙ]/,
  /^Epreuve\s+Tps\.?Base/i,
  /^Ouvreur\s*\(OUV\)/i,
];

// Regex : code club FFCK — 4 chiffres, optionnellement /4 chiffres, puis " - "
const CLUB_CODE_RE = /\d{4}(?:\/\d{4})*\s*-\s/;

// Regex : temps au format M:SS.ss, ou Abs / Abd / Dsq
const TIME_TOKEN_RE = /(\d+:\d+\.\d+|Abs|Abd|Dsq)/g;

function parseAthletePrefix(tokens: string[]): {
  rang: number | null; dossard: number | null; nomParts: string[];
} {
  let rang: number | null = null;
  let dossard: number | null = null;
  let ti = 0;

  if (tokens.length > 0 && /^\d+$/.test(tokens[0])) {
    const first = parseInt(tokens[0], 10);
    ti = 1;
    if (ti < tokens.length && /^\d+$/.test(tokens[ti])) {
      rang = first;
      dossard = parseInt(tokens[ti], 10);
      ti++;
    } else {
      dossard = first;
    }
  }

  return { rang, dossard, nomParts: tokens.slice(ti) };
}

function parseTimesAndPoints(fromClub: string): {
  temps: string | null; dns: boolean; dnf: boolean; dsq: boolean; points: number | null;
} {
  const timeTokens: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(TIME_TOKEN_RE.source, 'g');
  while ((m = re.exec(fromClub)) !== null) timeTokens.push(m[1]);

  const dns = timeTokens.length > 0 && timeTokens.every(t => t === 'Abs');
  const dsq = !dns && timeTokens.some(t => t === 'Dsq');
  const dnf = !dns && !dsq && timeTokens.some(t => t === 'Abd');

  // Meilleur temps = 3e colonne temps (index 2), sinon 1er
  const meilRaw = timeTokens.length >= 3 ? timeTokens[2] : (timeTokens[0] ?? null);
  const temps = meilRaw && meilRaw !== 'Abs' && meilRaw !== 'Abd' && meilRaw !== 'Dsq' ? meilRaw : null;

  // Points = dernier entier sur la ligne (après les temps et l'écart)
  const stripped = fromClub
    .replace(/\d+:\d+\.\d+|Abs|Abd|Dsq/g, '')
    .replace(/\+[\d:.]+|00\.00/g, '')
    .trim();
  const ptMatch = /(\d+)\s*$/.exec(stripped);
  const points = ptMatch ? parseInt(ptMatch[1], 10) : null;

  return { temps, dns, dnf, dsq, points };
}

// Une ligne compte comme "ligne de données" (catégorie ou athlète) plutôt
// qu'un simple nom d'équipier biplace.
function isStructuralLine(line: string): boolean {
  if (SKIP_RE.some(r => r.test(line))) return true;
  if (line.search(CLUB_CODE_RE) >= 0) return true;
  if (/\(([A-Z][A-Z0-9]+)\)\s*$/.test(line) && /^(Kayak|Canoë)/i.test(line)) return true;
  return false;
}

export function parseResultatsPDF(rawText: string): ParsedResultat[] {
  // Réparation ligne par ligne : une ligne isolée qui échoue à se reconstruire
  // (octet inattendu) ne doit pas empêcher la réparation des autres lignes.
  const lines = rawText
    .split('\n')
    .map(l => fixMojibake(l.trim()))
    .filter(Boolean);

  const results: ParsedResultat[] = [];
  let currentCategorie = '';
  // Biplace (C2) : le nom du 1er équipier apparaît sur la ligne précédant
  // la ligne rang/dossard/club/temps ; celui du 2e équipier sur la ligne suivante.
  let pendingNameBefore = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (SKIP_RE.some(r => r.test(line))) continue;

    // ── Détection header catégorie ──────────────────────────────────────
    const catMatch = /\(([A-Z][A-Z0-9]+)\)\s*$/.exec(line);
    if (catMatch && /^(Kayak|Canoë)/i.test(line)) {
      currentCategorie = catMatch[1];
      pendingNameBefore = '';
      continue;
    }

    if (!currentCategorie) continue;

    // ── Ligne contenant un code club → ligne athlète complète ───────────
    const clubIdx = line.search(CLUB_CODE_RE);

    if (clubIdx >= 0) {
      const beforeClub = line.slice(0, clubIdx).trim();
      const fromClub   = line.slice(clubIdx);

      const tokens = beforeClub.split(/\s+/).filter(Boolean);
      const parsed = parseAthletePrefix(tokens);
      const { rang, dossard } = parsed;
      let nom = parsed.nomParts.join(' ');

      if (currentCategorie.startsWith('C2')) {
        const parts: string[] = [];
        if (pendingNameBefore) parts.push(pendingNameBefore);
        if (nom) parts.push(nom);
        const next = lines[i + 1];
        if (next !== undefined && !isStructuralLine(next)) {
          parts.push(next);
          i++; // consomme la ligne du 2e équipier
        }
        nom = parts.join(' / ');
        pendingNameBefore = '';
      }

      // Club : tout ce qui précède les temps
      const clubEndMatch = /(\d+:\d+\.\d+|Abs|Abd)/.exec(fromClub);
      const club = clubEndMatch
        ? fromClub.slice(0, clubEndMatch.index).trim().replace(/\s+$/, '')
        : fromClub.split(/\s{2,}/)[0].trim();

      const { temps, dns, dnf, dsq, points } = parseTimesAndPoints(fromClub);

      if (dossard !== null && nom) {
        results.push({ categorie: currentCategorie, rang, dossard, nom, club, temps, points, dns, dnf, dsq });
      }
      continue;
    }

    // ── Ligne sans code club : nom du 1er équipier d'un biplace ─────────
    if (currentCategorie.startsWith('C2')) {
      pendingNameBefore = line;
    }
  }

  return results.filter(r => r.nom.trim() !== '');
}
