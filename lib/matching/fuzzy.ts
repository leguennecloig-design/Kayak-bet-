// Helpers de matching flou réutilisables (noms de compétitions, noms d'athlètes...).
// Aucune dépendance : Levenshtein pur, pas de pg_trgm.

export function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // supprime les diacritiques
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Distance de Levenshtein (implémentation itérative, sans dépendance)
export function levenshtein(a: string, b: string): number {
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
export function stringSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const na = normalizeStr(a), nb = normalizeStr(b);
  if (na === nb) return 1;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}
