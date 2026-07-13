export const ALGO_PARAMS = {
  // Saison prise en compte pour les cotes (v4 : uniquement 2026).
  // Explicite, pas basé sur l'horloge murale (getFullYear) — évite qu'un
  // recalcul en janvier suivant vide tout l'historique.
  SAISON_COTES: 2026,

  // ═══ v4 — poids du score composite (tous tunables) ═══
  // Cas STANDARD (hors M22-avec-SEF) : national 50 / numérique 25 / relatif 25.
  // Le "relatif catégorie" (Bradley-Terry) est appliqué en mélange de force
  // (voir computeForces), pas dans le composite absolu ; le composite absolu
  // ne mélange donc que national + numérique.
  V4_W_NATIONAL: 0.50,
  V4_W_NUMERIQUE: 0.25,
  V4_W_RELATIF:   0.25,   // poids du mélange BT (1re passe) dans la force finale
  // Cas M22 AVEC résultats SEF 2026 : sef 50 / national 25 / numérique 15 / relatif 10.
  V4_M22_W_SEF:       0.50,
  V4_M22_W_NATIONAL:  0.25,
  V4_M22_W_NUMERIQUE: 0.15,
  V4_M22_W_RELATIF:   0.10,
  // Sous-pondération à l'intérieur du bloc "national" : N1 71% / IR 29%
  // (ratio 25/10 hérité de la v3). À réajuster si le volume IR 2026 est faible.
  V4_N1_RATIO: 0.71,
  V4_IR_RATIO: 0.29,

  // Fiabilité = min(1.0, BASE + INCREMENT × nb_courses)
  FIAB_SEF_BASE: 0.60, FIAB_SEF_INC: 0.13,
  FIAB_NAT_BASE: 0.60, FIAB_NAT_INC: 0.10,
  FIAB_IR_BASE:  0.50, FIAB_IR_INC:  0.10,

  // Pénalité appliquée aux scores de course quand on se rabat sur l'AUTRE
  // discipline (fallback_type === 'autre_discipline').
  FIAB_FALLBACK_AUTRE_DISCIPLINE: 0.75,

  // Confrontations directes ±25%
  BONUS_CONFRONTATION: 0.25,

  // CDF normale
  SIGMA_FACTOR: 0.55,
  SIGMA_MIN: 0.80,

  // Marge bookmaker
  MARGE: 1.10,

  // ═══ v4 — calibration des cotes : bornes [min, max] par type de pari ═══
  // Ancrages (planchers) calibrés : un favori évident tombe au plancher.
  // Plafond global 30 ; temps à la seconde plafonné à 4.
  COTE_MAX_GLOBAL: 30.0,
  COTE_MIN_TOP1: 1.68,
  COTE_MIN_TOP3: 1.15,
  COTE_MIN_TOP5: 1.05,
  COTE_MIN_EXACT: 1.05,          // place exacte / temps dixième
  COTE_MAX_EXACT_TIME_SECOND: 4.0,
  COTE_MIN_EXACT_TIME_SECOND: 1.05,
  // Top10/20 : retirés de l'UI mais colonnes conservées (paris legacy).
  COTE_MAX_TOP10: 15.0,
  COTE_MAX_TOP20: 8.0,

  // Heuristique "temps exact" (pas de modèle de temps absolu) : proba de toucher
  // le temps ≈ prob d'être la performance de référence × facteur de précision.
  K_EXACT_TIME_TENTH:  0.06,   // dixième : très difficile → cote proche du plafond
  K_EXACT_TIME_SECOND: 0.90,   // seconde : bien plus facile → cote basse (≤ 4)

  // Décroissance exponentielle de la force selon le rang (Sprint Finale / Mass Start)
  K_FORCE: 0.20,

  ALGO_VERSION: 'v4.0',
} as const;
