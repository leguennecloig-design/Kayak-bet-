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

  // v4.1 — exposant de séparation Bradley-Terry (voir computeForces). Sans
  // lui, deux scores absolus compressés dans une bande étroite (ex 0.85 vs
  // 0.55) ne produisaient pas un écart de force suffisant pour que le rang
  // espéré d'un vrai favori s'approche de 1 — même un athlète en équipe de
  // France pouvait finir avec une cote Top1 plafonnée à 30. Calibré par
  // simulation (favori réaliste ~0.90 → cote Top1 ≈ 1.8-2.1).
  K_SHARPEN_FORCE: 7,

  // CDF normale — resserrée en v4.1 (avec K_SHARPEN_FORCE) pour que les
  // rangs espérés proches de 1 se traduisent par des cotes vraiment basses.
  SIGMA_FACTOR: 0.40,
  SIGMA_MIN: 0.60,

  // Marge bookmaker
  MARGE: 1.10,

  // ═══ v4 — calibration des cotes : bornes [min, max] par type de pari ═══
  // Ancrages (planchers) calibrés : un favori évident tombe au plancher.
  // Plafond global 30 (Top1 uniquement — les autres types ont leur propre
  // plafond, resserré en v4.2/v4.3).
  COTE_MAX_GLOBAL: 30.0,
  COTE_MIN_TOP1: 1.68,
  COTE_MIN_TOP3: 1.15,
  COTE_MIN_TOP5: 1.05,
  COTE_MIN_EXACT: 1.05,          // place exacte / temps dixième
  // v4.3 — plafonds resserrés pour place exacte / temps (jusqu'ici bornés au
  // plafond global 30 pour place exacte et temps dixième — beaucoup trop haut).
  COTE_MAX_EXACT_PLACE: 6.0,
  COTE_MAX_EXACT_TIME: 15.0,      // temps au dixième
  COTE_MAX_EXACT_TIME_SECOND: 5.0,
  COTE_MIN_EXACT_TIME_SECOND: 1.05,
  // v4.2 — Top3/Top5/Top10 resserrés : jusqu'ici bornés au plafond global (30),
  // beaucoup trop haut pour des paris structurellement "plus faciles" que le
  // vainqueur. Top10/20 : retirés de l'UI mais colonnes conservées (paris legacy).
  COTE_MAX_TOP3:  15.0,
  COTE_MAX_TOP5:  10.0,
  COTE_MAX_TOP10:  8.0,
  COTE_MAX_TOP20:  8.0,

  // v4.2 — garde-fou par classement numérique : un athlète bien classé au
  // classement numérique 2026 est un favori réel, indépendamment de la
  // qualité/disponibilité de ses résultats de course (composite dilué par un
  // signal national faible ou absent). On cape directement cote_top1/3/5/10
  // selon rang_national, PAR-DESSUS le calcul Bradley-Terry — un garde-fou,
  // pas un remplacement du modèle. Valeurs tunables.
  RANG_NUM_CAP10_TOP1:  10,
  RANG_NUM_CAP10_TOP3:   6,
  RANG_NUM_CAP10_TOP5:   4,
  RANG_NUM_CAP10_TOP10:  3,
  RANG_NUM_CAP20_TOP1:  20,
  RANG_NUM_CAP20_TOP3:  12,
  RANG_NUM_CAP20_TOP5:   8,
  RANG_NUM_CAP20_TOP10:  6,

  // Heuristique "temps exact" (pas de modèle de temps absolu) : proba de toucher
  // le temps ≈ prob d'être la performance de référence × facteur de précision.
  K_EXACT_TIME_TENTH:  0.06,   // dixième : très difficile → cote proche du plafond
  K_EXACT_TIME_SECOND: 0.90,   // seconde : bien plus facile → cote basse (≤ 4)

  // Décroissance exponentielle de la force selon le rang (Sprint Finale / Mass Start)
  K_FORCE: 0.20,

  ALGO_VERSION: 'v4.3',
} as const;
