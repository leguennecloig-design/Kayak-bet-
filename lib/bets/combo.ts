// Bonus de gain pour un pari combiné (2+ sélections) — vient S'AJOUTER à la
// multiplication normale des cotes entre elles, pas à la remplacer. Croît
// modérément avec le nombre de sélections plutôt qu'un x2 fixe (qui devenait
// écrasant combiné à la multiplication des cotes sur un gros combiné), et
// plafonné pour ne jamais "trop multiplier" même sur beaucoup de sélections.
// Partagé entre le client (aperçu du gain) et le serveur (calcul faisant foi)
// pour qu'ils ne puissent jamais diverger.
export const COMBO_BONUS_PER_EXTRA = 0.15; // +15% par sélection au-delà de la 1ère
export const COMBO_BONUS_MAX = 1.60;       // plafond du bonus, quel que soit le nombre de sélections

export function comboBonusFor(selectionCount: number): number {
  if (selectionCount <= 1) return 1;
  return Math.min(1 + COMBO_BONUS_PER_EXTRA * (selectionCount - 1), COMBO_BONUS_MAX);
}
