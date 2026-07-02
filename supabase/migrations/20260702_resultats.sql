-- Table des résultats officiels de compétition (format compétFFCK)

CREATE TABLE IF NOT EXISTS resultats (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID    NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  categorie      TEXT    NOT NULL,
  rang           INTEGER,            -- NULL si DNS/DNF
  dossard        INTEGER,
  nom            TEXT    NOT NULL,
  club           TEXT,
  temps          TEXT,               -- meilleur temps ex: "1:21.63"
  points         INTEGER,
  dns            BOOLEAN DEFAULT false,   -- Absent (did not start)
  dnf            BOOLEAN DEFAULT false,   -- Abandonné (did not finish)
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(competition_id, categorie, dossard)
);

CREATE INDEX IF NOT EXISTS idx_resultats_competition ON resultats(competition_id);

ALTER TABLE resultats ENABLE ROW LEVEL SECURITY;

-- Admins peuvent tout faire
CREATE POLICY "Admin full access resultats"
  ON resultats
  USING (true)
  WITH CHECK (true);

-- Le public peut voir les résultats des compétitions publiées ou terminées
CREATE POLICY "Public voir resultats comp publiees"
  ON resultats FOR SELECT
  USING (
    competition_id IN (
      SELECT id FROM competitions WHERE status IN ('published', 'closed')
    )
  );
