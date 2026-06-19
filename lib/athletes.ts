import classementJson from "@/data/classement_2026.json";

export type Athlete = {
  rang: number;
  nom_prenom: string;
  club: string;
  code_bateau: string;
  points: number;
  nb_courses: number;
};

export const CATEGORY_LABELS: Record<string, string> = {
  C1D:    "Canoë 1 — Dame Senior",
  C1DU15: "Canoë 1 — Dame U15",
  C1DU18: "Canoë 1 — Dame U18",
  C1HM1:  "Canoë 1 — Homme M1",
  C1HM2:  "Canoë 1 — Homme M2",
  C1HM22: "Canoë 1 — Homme M22",
  C1HM3:  "Canoë 1 — Homme M3",
  C1HU15: "Canoë 1 — Homme U15",
  C1HU18: "Canoë 1 — Homme U18",
  C1HU21: "Canoë 1 — Homme U21",
  C2D:    "Canoë 2 — Dame Senior",
  C2DU15: "Canoë 2 — Dame U15",
  C2H:    "Canoë 2 — Homme Senior",
  C2HM:   "Canoë 2 — Homme Master",
  C2HU15: "Canoë 2 — Homme U15",
  C2HU18: "Canoë 2 — Homme U18",
  C2M:    "Canoë 2 — Mixte Senior",
  C2MU15: "Canoë 2 — Mixte U15",
  K1DM:   "Kayak 1 — Dame Master",
  K1DM22: "Kayak 1 — Dame M22",
  K1DU15: "Kayak 1 — Dame U15",
  K1DU18: "Kayak 1 — Dame U18",
  K1DU21: "Kayak 1 — Dame U21",
  K1HM1:  "Kayak 1 — Homme M1",
  K1HM2:  "Kayak 1 — Homme M2",
  K1HM22: "Kayak 1 — Homme M22",
  K1HM3:  "Kayak 1 — Homme M3",
  K1HU15: "Kayak 1 — Homme U15",
  K1HU18: "Kayak 1 — Homme U18",
  K1HU21: "Kayak 1 — Homme U21",
};

export const classement = classementJson as Record<string, Athlete[]>;
export const categories = Object.keys(classement);
