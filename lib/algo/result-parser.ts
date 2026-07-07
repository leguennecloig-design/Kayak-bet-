// Parser universel pour les fichiers de résultats uploadés par l'admin
// (Sprint Finale : qualifs / Mass Start : classique du week-end).
// Formats acceptés : CSV (, ou ;), TXT (espaces multiples ou tabulation), JSON.
// Champs obligatoires : rang, code_bateau, categorie. Optionnels : nom, prenom, temps_ms.

export interface ParsedResult {
  rang: number;
  code_bateau: string;
  categorie: string;
  nom?: string;
  prenom?: string;
  temps_ms?: number;
}

export interface ParseResult {
  success: boolean;
  data: ParsedResult[];
  errors: string[];
  format_detected: "csv" | "tsv" | "json" | "unknown";
}

export function parseResultFile(content: string, filename: string): ParseResult {
  const ext = filename.split(".").pop()?.toLowerCase();
  const trimmed = content.trim();

  if (ext === "json" || trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return parseJSON(trimmed);
  }

  if (ext === "csv" || trimmed.includes(",")) {
    const sep = trimmed.includes(";") ? ";" : ",";
    return parseDelimited(trimmed, sep, "csv");
  }

  // TXT → tabulation ou espaces multiples
  return parseDelimited(trimmed, "\t", "tsv");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJSON(content: string): ParseResult {
  try {
    const raw = JSON.parse(content);
    const arr = Array.isArray(raw) ? raw : [raw];
    const data: ParsedResult[] = [];
    const errors: string[] = [];

    arr.forEach((row, i) => {
      if (!row.rang || !row.code_bateau || !row.categorie) {
        errors.push(`Ligne ${i + 1}: champs obligatoires manquants (rang, code_bateau, categorie)`);
        return;
      }
      data.push({
        rang: Number(row.rang),
        code_bateau: String(row.code_bateau).trim(),
        categorie: String(row.categorie).trim(),
        nom: row.nom ? String(row.nom).trim() : undefined,
        prenom: row.prenom ? String(row.prenom).trim() : undefined,
        temps_ms: row.temps_ms ? Number(row.temps_ms) : undefined,
      });
    });

    return { success: errors.length === 0, data, errors, format_detected: "json" };
  } catch {
    return { success: false, data: [], errors: ["JSON invalide"], format_detected: "unknown" };
  }
}

function parseDelimited(content: string, sep: string, format: "csv" | "tsv"): ParseResult {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { success: false, data: [], errors: ["Fichier vide"], format_detected: format };
  }

  const data: ParsedResult[] = [];
  const errors: string[] = [];

  // Détecter si la première ligne est un header
  const firstCols = lines[0].split(sep).map((c) => c.trim().toLowerCase());
  const hasHeader = firstCols.includes("rang") || firstCols.includes("code_bateau");
  const startLine = hasHeader ? 1 : 0;

  const colMap: Record<string, number> = {};
  if (hasHeader) {
    firstCols.forEach((col, i) => { colMap[col] = i; });
  } else {
    // Ordre par défaut : rang, nom, prenom, code_bateau, categorie, temps_ms
    colMap.rang = 0;
    colMap.nom = 1;
    colMap.prenom = 2;
    colMap.code_bateau = 3;
    colMap.categorie = 4;
    colMap.temps_ms = 5;
  }

  const get = (cols: string[], key: string): string | undefined =>
    colMap[key] !== undefined ? cols[colMap[key]]?.trim() : undefined;

  for (let i = startLine; i < lines.length; i++) {
    // TXT avec espaces multiples → normaliser en tabulation
    const line = format === "tsv" && !lines[i].includes("\t")
      ? lines[i].replace(/\s{2,}/g, "\t")
      : lines[i];

    const cols = line.split(sep === "\t" ? "\t" : sep).map((c) => c.trim());

    const rangRaw = get(cols, "rang");
    const rang = Number(rangRaw);
    const code_bateau = get(cols, "code_bateau");
    const categorie = get(cols, "categorie");

    if (!rangRaw || Number.isNaN(rang) || !code_bateau || !categorie) {
      errors.push(`Ligne ${i + 1}: champs obligatoires manquants`);
      continue;
    }

    const tempsRaw = get(cols, "temps_ms");

    data.push({
      rang,
      code_bateau,
      categorie,
      nom: get(cols, "nom"),
      prenom: get(cols, "prenom"),
      temps_ms: tempsRaw ? Number(tempsRaw) : undefined,
    });
  }

  return { success: errors.length === 0, data, errors, format_detected: format };
}
