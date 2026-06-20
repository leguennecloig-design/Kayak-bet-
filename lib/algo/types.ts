export interface AthleteInStartlist {
  code_bateau: string;
  athlete_id: string | null;
  nom: string;
  categorie: string;
  rang_national: number;
  points_classement: number;
  nb_courses_classement: number;
  // v2.0 — discipline-spécifique
  places_discipline: number[];
  nb_courses_discipline: number;
  fallback_type: 'discipline' | 'autre_discipline' | 'national_only';
}

export interface CoteResult {
  code_bateau: string;
  athlete_id: string | null;
  nom: string;
  categorie: string;
  nb_athletes_startlist: number;
  rang_national: number;
  points_classement: number;
  place_moyenne_discipline: number | null;
  force_score: number;
  rang_espere: number;
  sigma: number;
  fallback_type: string;
  prob_top1: number;  cote_top1: number;
  prob_top3: number;  cote_top3: number;
  prob_top5: number;  cote_top5: number;
  prob_top10: number; cote_top10: number;
  prob_top20: number; cote_top20: number;
  cote_exact_place: number;
  cote_exact_time: number;
  algo_version: string;
}

export type BetType =
  | "TOP_1"
  | "TOP_3"
  | "TOP_5"
  | "TOP_10"
  | "TOP_20"
  | "EXACT_PLACE"
  | "EXACT_TIME";
