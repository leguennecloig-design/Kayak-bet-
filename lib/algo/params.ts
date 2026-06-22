export const ALGO_PARAMS = {
  // Poids sources (somme = 1.0) — NUM secondaire, résultats de course prioritaires
  W_SEF: 0.40,
  W_NAT: 0.35,
  W_IR:  0.10,
  W_NUM: 0.15,

  // Fiabilité = min(1.0, BASE + INCREMENT × nb_courses)
  FIAB_SEF_BASE: 0.60, FIAB_SEF_INC: 0.13,
  FIAB_NAT_BASE: 0.60, FIAB_NAT_INC: 0.10,
  FIAB_IR_BASE:  0.50, FIAB_IR_INC:  0.10,

  // Pénalité fallback discipline
  FIAB_FALLBACK_AUTRE_DISCIPLINE: 0.75,

  // Confrontations directes ±25%
  BONUS_CONFRONTATION: 0.25,

  // CDF normale
  SIGMA_FACTOR: 0.55,
  SIGMA_MIN: 0.80,

  // Marge bookmaker
  MARGE: 1.10,
  COTE_MIN: 1.05,

  // Plafonds Top 1 par rang national
  PLAFOND_TOP1_RANG_10: 12.0,
  PLAFOND_TOP1_RANG_20: 15.0,
  PLAFOND_TOP1_AU_DELA: 30.0,

  // Plafonds autres tops
  PLAFOND_TOP3:  30.0,
  PLAFOND_TOP5:  20.0,
  PLAFOND_TOP10: 10.0,
  PLAFOND_TOP20:  5.0,

  ALGO_VERSION: 'v3.0',
} as const;
