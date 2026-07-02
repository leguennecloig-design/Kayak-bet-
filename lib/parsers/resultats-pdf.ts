// Parser de résultats compétition FFCK (format competFFCK v6.x)
//
// Structure PDF :
//   En-tête : nom compétition, lieu, dates
//   Par catégorie :
//     Header : "Canoë monoplace homme M22 (C1HM22)" ou "Kayak dame U18 (K1DU18)"
//     Colonnes : Clt | Dos | Nom - Prénom | Club | Tps M1 | Tps M2 | Meil Tps | Ecart | Point
//     Monoplace : une ligne par athlète
//     Biplace (C2) : dossard + noms sur 2 lignes, puis club + temps
//
// Stratégie :
//   - Détecter les headers de catégorie par le code entre parenthèses
//   - Chercher le code club (XXXX - ) dans chaque ligne pour identifier les lignes athlètes
//   - Accumuler les noms biplaces sur les lignes précédant le club

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

// Regex : temps au format M:SS.ss, ou Abs / Abd
const TIME_TOKEN_RE = /(\d+:\d+\.\d+|Abs|Abd)/g;

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
  temps: string | null; dns: boolean; dnf: boolean; points: number | null;
} {
  const timeTokens: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(TIME_TOKEN_RE.source, 'g');
  while ((m = re.exec(fromClub)) !== null) timeTokens.push(m[1]);

  const dns = timeTokens.length > 0 && timeTokens.every(t => t === 'Abs');
  const dnf = !dns && timeTokens.some(t => t === 'Abd');

  // Meilleur temps = 3e colonne temps (index 2), sinon 1er
  const meilRaw = timeTokens.length >= 3 ? timeTokens[2] : (timeTokens[0] ?? null);
  const temps = meilRaw && meilRaw !== 'Abs' && meilRaw !== 'Abd' ? meilRaw : null;

  // Points = dernier entier sur la ligne (après les temps et l'écart)
  const stripped = fromClub
    .replace(/\d+:\d+\.\d+|Abs|Abd/g, '')
    .replace(/\+[\d:.]+|00\.00/g, '')
    .trim();
  const ptMatch = /(\d+)\s*$/.exec(stripped);
  const points = ptMatch ? parseInt(ptMatch[1], 10) : null;

  return { temps, dns, dnf, points };
}

export function parseResultatsPDF(rawText: string): ParsedResultat[] {
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const results: ParsedResultat[] = [];
  let currentCategorie = '';

  // Buffer pour biplaces : accumule infos avant d'avoir le club
  type BiplaceBuffer = {
    rang: number | null;
    dossard: number | null;
    noms: string[];
  };
  let biplaceBuffer: BiplaceBuffer | null = null;

  for (const line of lines) {
    // Skip lignes non-données
    if (SKIP_RE.some(r => r.test(line))) continue;

    // ── Détection header catégorie ──────────────────────────────────────
    const catMatch = /\(([A-Z][A-Z0-9]+)\)\s*$/.exec(line);
    if (catMatch && /^(Kayak|Canoë)/i.test(line)) {
      // Flush buffer biplace en attente
      if (biplaceBuffer) {
        // Biplace sans club trouvé — on l'ignore (ligne fragmentée)
        biplaceBuffer = null;
      }
      currentCategorie = catMatch[1];
      continue;
    }

    if (!currentCategorie) continue;

    // ── Ligne contenant un code club → ligne athlète complète ───────────
    const clubIdx = line.search(CLUB_CODE_RE);

    if (clubIdx >= 0) {
      const beforeClub = line.slice(0, clubIdx).trim();
      const fromClub   = line.slice(clubIdx);

      // Récupérer les noms/bib du buffer biplace ou de la ligne elle-même
      let rang: number | null = null;
      let dossard: number | null = null;
      let nom = '';

      if (biplaceBuffer) {
        rang    = biplaceBuffer.rang;
        dossard = biplaceBuffer.dossard;
        // On ajoute éventuellement des noms restants dans beforeClub
        const extraNames = beforeClub.trim();
        if (extraNames) biplaceBuffer.noms.push(extraNames);
        nom = biplaceBuffer.noms.join(' / ');
        biplaceBuffer = null;
      } else {
        const tokens = beforeClub.split(/\s+/).filter(Boolean);
        const parsed = parseAthletePrefix(tokens);
        rang    = parsed.rang;
        dossard = parsed.dossard;
        nom     = parsed.nomParts.join(' ');
      }

      // Club : tout ce qui précède les temps
      const clubEndMatch = /(\d+:\d+\.\d+|Abs|Abd)/.exec(fromClub);
      const club = clubEndMatch
        ? fromClub.slice(0, clubEndMatch.index).trim().replace(/\s+$/, '')
        : fromClub.split(/\s{2,}/)[0].trim();

      const { temps, dns, dnf, points } = parseTimesAndPoints(fromClub);

      if (dossard !== null && nom) {
        results.push({ categorie: currentCategorie, rang, dossard, nom, club, temps, points, dns, dnf });
      }
      continue;
    }

    // ── Ligne sans code club ─────────────────────────────────────────────

    // Vérifier si c'est le début d'une entrée biplace : débute par rang+dossard
    const tokens = line.split(/\s+/).filter(Boolean);
    const isBiplaceStart =
      currentCategorie.startsWith('C2') &&
      tokens.length >= 2 &&
      /^\d+$/.test(tokens[0]) &&
      /^\d+$/.test(tokens[1]);

    if (isBiplaceStart) {
      // Flush buffer précédent si incomplet
      biplaceBuffer = null;
      const parsed = parseAthletePrefix(tokens);
      biplaceBuffer = {
        rang:    parsed.rang,
        dossard: parsed.dossard,
        noms:    parsed.nomParts.length > 0 ? [parsed.nomParts.join(' ')] : [],
      };
      continue;
    }

    // Ligne de nom biplace (suite)
    if (biplaceBuffer && /^[A-ZÉÀÈÙÂÊÎÔÛÇ]/.test(line) && !/^\d/.test(line)) {
      biplaceBuffer.noms.push(line);
      continue;
    }

    // Ligne "dossard seul" pour biplace absent (ex: "281 COMBE Corentin ... Abs Abs Abs")
    // Géré au prochain tour si la ligne a un club — sinon on ignore.
  }

  // Flush buffer restant
  if (biplaceBuffer) biplaceBuffer = null;

  return results.filter(r => r.nom.trim() !== '');
}
