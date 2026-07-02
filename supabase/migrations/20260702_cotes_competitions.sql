-- Migration : table cotes + colonne epreuve sur inscriptions
-- Date : 2026-07-02

-- Ajoute la colonne epreuve sur inscriptions (ex: K1HM, K1DU18, C2HM…)
-- Permet de grouper les partants par catégorie pour le calcul des cotes.
ALTER TABLE inscriptions ADD COLUMN IF NOT EXISTS epreuve TEXT;

-- Table des cotes calculées par l'algorithme Bradley-Terry v3
-- Liée à competitions (nouvelle architecture FFCK-first)
CREATE TABLE IF NOT EXISTS cotes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id   UUID        NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  code_bateau      TEXT        NOT NULL,
  athlete_id       UUID        REFERENCES athletes(id),
  nom              TEXT        NOT NULL,
  categorie        TEXT        NOT NULL,

  -- Données de classement et score
  nb_athletes_startlist  INTEGER,
  rang_national          INTEGER,
  points_classement      NUMERIC,
  score_composite        NUMERIC,
  score_final            NUMERIC,
  rang_espere            INTEGER,
  sigma                  NUMERIC,
  fallback_type          TEXT,
  sources_utilisees      TEXT,

  -- Probabilités
  prob_top1   NUMERIC,  cote_top1   NUMERIC,
  prob_top3   NUMERIC,  cote_top3   NUMERIC,
  prob_top5   NUMERIC,  cote_top5   NUMERIC,
  prob_top10  NUMERIC,  cote_top10  NUMERIC,
  prob_top20  NUMERIC,  cote_top20  NUMERIC,

  cote_exact_place NUMERIC,
  cote_exact_time  NUMERIC,
  algo_version     TEXT,
  calculated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(competition_id, code_bateau)
);

CREATE INDEX IF NOT EXISTS idx_cotes_competition ON cotes(competition_id);
CREATE INDEX IF NOT EXISTS idx_cotes_athlete     ON cotes(athlete_id);

-- RLS : admin (service_role) accède librement ; public peut lire les cotes
-- des compétitions publiées
ALTER TABLE cotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public peut lire les cotes des comp publiées"
  ON cotes FOR SELECT
  USING (
    competition_id IN (
      SELECT id FROM competitions WHERE status = 'published'
    )
  );
