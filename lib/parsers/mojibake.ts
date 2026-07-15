// Réparation du mojibake classique "UTF-8 relu comme Windows-1252"
// (ex: "Ã©" → "é") — partagée entre les différents parsers de résultats
// (PDF/TXT compétFFCK, export Markdown) qui peuvent tous être affectés par
// la même corruption d'encodage selon l'outil qui a produit le fichier.

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
export function fixMojibake(text: string): string {
  // Le déclencheur doit juste repérer une "Ã" suivie d'un autre caractère —
  // la reconstruction elle-même (plus bas) est ce qui garantit l'innocuité :
  // elle échoue proprement (retourne le texte d'origine) si un caractère
  // n'est pas mappable en Windows-1252 ou si le décodage UTF-8 résultant est
  // invalide. Une version antérieure ne déclenchait que sur "Ã-" ou "Ã¿"
  // littéralement (classe de caractères `[-¿]` mal comprise), ce qui ratait
  // silencieusement la quasi-totalité des cas réels ("Ã©" → "é", etc.).
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
