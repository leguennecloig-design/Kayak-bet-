-- Migration : système d'inscriptions FFCK (partants Descente)
-- À appliquer via l'interface SQL Supabase ou le CLI supabase db push.
-- Date : 2026-07-02

-- 1. Nouvelles colonnes sur la table competitions existante
ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS ffck_inscription_code INTEGER,
  ADD COLUMN IF NOT EXISTS ffck_match_status TEXT DEFAULT 'non_matche';

-- Valeurs possibles pour ffck_match_status :
--   'non_matche'    → pas encore traité
--   'matche_auto'   → matching automatique réussi (confiance ≥ seuil)
--   'matche_manuel' → matching confirmé manuellement par l'admin
--   'ambigu'        → plusieurs candidats FFCK trouvés, en attente de choix
--   'introuvable'   → aucun candidat FFCK trouvé pour cette compétition

-- 2. Table des partants scrapés depuis participant.php?code={ffck_inscription_code}
CREATE TABLE IF NOT EXISTS inscriptions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id  UUID        NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  code_bateau     TEXT        NOT NULL,
  nom             TEXT        NOT NULL,
  sexe            TEXT,                    -- 'H' | 'D', dérivé du code épreuve FFCK
  club            TEXT,
  numero_club     TEXT,
  licence_valide  BOOLEAN,
  pagaie_couleur  TEXT,                    -- ex: PAGBL, PAGN, PAGV
  athlete_id      UUID REFERENCES athletes(id),  -- rempli si code_bateau matche un athlète existant
  scraped_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(competition_id, code_bateau)
);

CREATE INDEX IF NOT EXISTS idx_inscriptions_competition ON inscriptions(competition_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_code_bateau ON inscriptions(code_bateau);
CREATE INDEX IF NOT EXISTS idx_inscriptions_athlete     ON inscriptions(athlete_id);
