export type FallbackType = 'discipline' | 'autre_discipline' | 'national_only'
export type SourceType = 'SEF' | 'NAT' | 'IR' | 'NUM'

export interface AthleteInStartlist {
  code_bateau: string
  athlete_id: string | null
  nom: string
  categorie: string

  // Classement numérique
  rang_national: number
  points_classement: number
  nb_courses_classement: number

  // Résultats par source et discipline (tableau de places)
  sef: number[]
  nat: number[]
  ir:  number[]

  // 'discipline' si résultats dans la même discipline
  // 'autre_discipline' si fallback vers l'autre discipline
  // 'national_only' si aucun résultat en course
  fallback_type: FallbackType
}

export interface CoteResult {
  code_bateau: string
  athlete_id: string | null
  nom: string
  categorie: string
  nb_athletes_startlist: number
  rang_national: number
  points_classement: number
  score_composite: number
  score_final: number
  rang_espere: number
  sigma: number
  fallback_type: FallbackType
  sources_utilisees: string  // ex: "SEF+NAT+NUM"

  prob_top1:  number; cote_top1:  number
  prob_top3:  number; cote_top3:  number
  prob_top5:  number; cote_top5:  number
  prob_top10: number; cote_top10: number
  prob_top20: number; cote_top20: number

  cote_exact_place:      number  // cote représentative (place la plus probable) ; le vrai calcul est dynamique
  cote_exact_time:       number  // temps au dixième
  cote_exact_time_second: number // temps à la seconde (plafond 4)
  algo_version: string
  format_course?: 'standard' | 'sprint_finale' | 'mass_start'
}

export type BetType =
  | "TOP_1"
  | "TOP_3"
  | "TOP_5"
  | "TOP_10"
  | "TOP_20"
  | "EXACT_PLACE"
  | "EXACT_TIME";
