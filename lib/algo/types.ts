export interface AthleteInStartlist {
  code_bateau: string;
  athlete_id: string | null;
  nom: string;
  categorie: string;
  rang_national: number;
  points_classement: number;
  nb_courses_classement: number;
}

export interface CoteResult {
  code_bateau: string;
  athlete_id: string | null;
  nom: string;
  categorie: string;
  nb_athletes_startlist: number;
  rang_national: number;
  points_classement: number;
  force_score: number;
  rang_espere: number;
  sigma: number;
  prob_top1: number;  cote_top1: number;
  prob_top3: number;  cote_top3: number;
  prob_top5: number;  cote_top5: number;
  prob_top10: number; cote_top10: number;
  prob_top20: number; cote_top20: number;
  cote_exact_place: 3.0;
  cote_exact_time: 10.0;
}

export type BetType =
  | "TOP_1"
  | "TOP_3"
  | "TOP_5"
  | "TOP_10"
  | "TOP_20"
  | "EXACT_PLACE"
  | "EXACT_TIME";
