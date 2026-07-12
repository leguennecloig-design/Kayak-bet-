// Convertit un temps stocké au format "M:SS.ss" (ex: "1:21.63") en secondes.
// Retourne null si le format est invalide ou absent (ex: "Abs"/"Abd").
export function parseTempsToSeconds(temps: string | null | undefined): number | null {
  if (!temps) return null;
  const m = /^(\d+):(\d+(?:\.\d+)?)$/.exec(temps.trim());
  if (!m) return null;
  const minutes = Number(m[1]);
  const seconds = Number(m[2]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  // Arrondi au dixième — même granularité que la saisie du pari "temps exact",
  // pour une comparaison exacte sans zone de tolérance.
  return Math.round((minutes * 60 + seconds) * 10) / 10;
}
