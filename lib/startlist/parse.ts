export interface ParsedAthlete {
  dossard: number;
  nom: string;
  prenom: string;
  club: string;
  depart: string;
  rawName: string;
  isBiplace: boolean;
}

export interface ParsedCategory {
  code: string;
  libelle: string;
  athletes: ParsedAthlete[];
  isBiplace: boolean;
}

export interface ParsedStartlist {
  nom_competition: string;
  lieu: string;
  date_debut: string | null;
  date_fin: string | null;
  type_epreuve: string;
  categories: ParsedCategory[];
}

const SKIP_CODES = ['OUV'];

function isHeaderOrFooter(line: string): boolean {
  return (
    line.includes('competFFCK') ||
    line.includes('Juge Arbitre') ||
    /^Edité le/i.test(line) ||
    /^Page \d+\/\d+/.test(line) ||
    /^\d{2}\/\d{2}\/\d{4}\s*-\s*\//.test(line)
  );
}

function isBiplace(code: string): boolean {
  return code.startsWith('C2') || code.startsWith('K2');
}

// Club français : commence par XXXX - ...
// Club étranger : - XXX  (code pays)
function isFrench(club: string): boolean {
  return /^\d{4}/.test(club.trim());
}

export function parseNomPrenom(raw: string): { nom: string; prenom: string } {
  const parts = raw.trim().split(/\s+/);
  let split = parts.length;
  for (let i = 0; i < parts.length; i++) {
    if (!/^[A-ZÀ-ÖØ-ÞŒŠŽ''`\-]+$/.test(parts[i])) {
      split = i;
      break;
    }
  }
  return {
    nom: parts.slice(0, split).join(' ') || parts[0],
    prenom: parts.slice(split).join(' '),
  };
}

function parseMonoplaceRow(line: string): ParsedAthlete | null {
  const timeM = line.match(/(\d+h\d+:\d+\.\d+)\s*$/);
  if (!timeM) return null;
  const depart = timeM[1];
  const withoutTime = line.slice(0, line.lastIndexOf(timeM[1])).trimEnd();

  // Club depuis la droite : XXXX[-/XXXX] - Name  ou  - CZE
  const clubM = withoutTime.match(/\s(\d{4}(?:\/\d{4})*\s*-\s*.+|-\s*[A-Z]{2,3})\s*$/);
  if (!clubM) return null;

  const club = clubM[1].trim();
  if (!isFrench(club)) return null; // étranger → ignoré

  const withoutClub = withoutTime.slice(0, withoutTime.lastIndexOf(clubM[0])).trimEnd();
  const dosM = withoutClub.match(/^(\d+)\s+(.+)$/);
  if (!dosM) return null;

  const rawName = dosM[2].trim();
  const { nom, prenom } = parseNomPrenom(rawName);

  return { dossard: parseInt(dosM[1], 10), nom, prenom, club, depart, rawName, isBiplace: false };
}

export function parseStartlistText(text: string): ParsedStartlist {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const result: ParsedStartlist = {
    nom_competition: '',
    lieu: '',
    date_debut: null,
    date_fin: null,
    type_epreuve: 'Classique',
    categories: [],
  };

  let headerDone = false;
  let currentCat: ParsedCategory | null = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isHeaderOrFooter(line)) { i++; continue; }
    if (/^Dos\s+Nom\s*-\s*Prénom/i.test(line)) { i++; continue; }
    if (/^Liste de Départ par Epreuves\s*:\s*(.+)/i.test(line)) {
      const m = line.match(/:\s*(.+)$/i);
      if (m) result.type_epreuve = m[1].trim();
      i++; continue;
    }

    // Header: nom, lieu, dates
    if (!headerDone) {
      const dateM = line.match(/Du\s+(\d{2}\/\d{2}\/\d{4})\s+au\s+(\d{2}\/\d{2}\/\d{4})/i);
      if (dateM) {
        result.date_debut = dateM[1];
        result.date_fin = dateM[2];
        headerDone = true;
        i++; continue;
      }
      if (!result.nom_competition) { result.nom_competition = line; i++; continue; }
      // Lieu : accepte les parenthèses purement numériques (code département ex: "(38)")
      // mais rejette les codes de catégorie qui contiennent des lettres (ex: "(K1HU18)")
      if (!result.lieu && result.nom_competition && !line.match(/\([A-Z][A-Z0-9]*\)/)) {
        result.lieu = line;
        i++; continue;
      }
    }

    // Category header: "Libellé (CODE)"
    const catM = line.match(/^(.+?)\s+\(([A-Z][A-Z0-9]+)\)\s*$/);
    if (catM) {
      const code = catM[2];
      if (!SKIP_CODES.includes(code)) {
        currentCat = { code, libelle: catM[1].trim(), athletes: [], isBiplace: isBiplace(code) };
        result.categories.push(currentCat);
      } else {
        currentCat = null;
      }
      i++; continue;
    }

    if (!currentCat) { i++; continue; }

    // Biplace : dossard seul sur sa ligne
    if (/^\d+$/.test(line) && currentCat.isBiplace) {
      const dossard = parseInt(line, 10);
      const names: string[] = [];
      let club = '';
      let depart = '';
      let j = i + 1;

      while (j < lines.length && j <= i + 8) {
        const nl = lines[j].trim();
        if (!nl || isHeaderOrFooter(nl) || /^Dos\s+Nom/i.test(nl)) { j++; continue; }
        if (nl.match(/^(.+?)\s+\(([A-Z][A-Z0-9]+)\)\s*$/)) break;

        const tM = nl.match(/(\d+h\d+:\d+\.\d+)\s*$/);
        if (tM) {
          depart = tM[1];
          const withoutT = nl.slice(0, nl.lastIndexOf(tM[1])).trimEnd();
          const cM = withoutT.match(/^(\d{4}(?:\/\d{4})*\s*-\s*.+|-\s*[A-Z]{2,3})\s*$/);
          club = cM ? cM[1].trim() : withoutT;
          j++; break;
        }

        // Ligne de nom
        if (nl && !/^\d{4}\s*-/.test(nl)) names.push(nl);
        j++;
      }

      i = j;
      if (isFrench(club)) {
        for (const name of names) {
          const { nom, prenom } = parseNomPrenom(name);
          currentCat.athletes.push({ dossard, nom, prenom, club, depart, rawName: name, isBiplace: true });
        }
      }
      continue;
    }

    // Monoplace
    const ath = parseMonoplaceRow(line);
    if (ath) currentCat.athletes.push(ath);

    i++;
  }

  // Supprimer catégories vides
  result.categories = result.categories.filter(c => c.athletes.length > 0);
  return result;
}

// Normalisation pour matching : sans accents, sans ponctuation, lowercase
// Utilise l'escape Unicode explicite ̀-ͯ (plage diacritiques combinants)
// pour éviter la corruption lors d'une ré-encodage du fichier source.
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Conversion date FR → ISO: "23/05/2026" → "2026-05-23"
export function frDateToISO(d: string): string | null {
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}
