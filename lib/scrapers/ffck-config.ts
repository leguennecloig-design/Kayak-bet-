// Config centralisée pour le scraper FFCK Inscriptions.
//
// Observation réelle (02/07/2026) :
// - competition.php affiche les données côté serveur, mais la pagination est gérée côté JS
//   via AJAX vers ajax_competition_load.php (voir competition.js?v8).
// - Pour avoir toutes les compétitions Descente en une seule requête, on appelle directement
//   l'endpoint AJAX avec activite[]=DES&page=500.
// - Code activité Descente confirmé : "DES" (option value="DES" dans le <select> de competition.php)
// - Colonnes participants réelles : code_bateau, nom, épreuve (K1HM/K1DM/K1HU18…),
//   N°Club, Club, Lic.2026, C.Médical, Pagaie C. — PAS de colonne "sexe" directe.
//   Le sexe est dérivé du code épreuve (3e caractère après le type bateau : H=Homme, D=Dame).

export const FFCK_SCRAPER_CONFIG = {
  BASE_URL: 'https://compet.ffck.org/inscriptions',
  // Endpoint AJAX — utilisé à la place de competition.php pour contourner la pagination JS
  AJAX_COMPETITION_URL: 'https://compet.ffck.org/inscriptions/ajax_competition_load.php',
  DISCIPLINE_FILTER: 'DES', // Descente uniquement — valeur confirmée dans le HTML réel
  REQUEST_DELAY_MS: 400,
  USER_AGENT: 'Kayakbet/1.0 (+contact admin si besoin)',
  FETCH_TIMEOUT_MS: 10_000,
  MATCH_DATE_TOLERANCE_DAYS: 1,
  MATCH_MIN_CONFIDENCE: 0.75, // seuil: similarité ville+nom pour auto-match sans ambiguïté
} as const;
