-- Table des résultats live FFCK (synchronisés via WebSocket)
-- Chaque ligne = un athlète dans une épreuve d'une compétition active
CREATE TABLE IF NOT EXISTS public.live_resultats (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_key TEXT        NOT NULL,           -- clé FFCK unique (ex: "FR2026-001")
  competition_nom TEXT,
  competition_ville TEXT,
  code_activite   TEXT,                           -- DSC, SLA, EXS
  epreuve         TEXT        NOT NULL,           -- ex: K1HM22, C1DM, K1DU18
  etat_epreuve    INTEGER     DEFAULT 3,          -- 3=en cours, 4=officieux, 5=officiel
  rang            INTEGER,                        -- classement provisoire
  dossard         INTEGER     NOT NULL,
  nom             TEXT        NOT NULL,
  club            TEXT,
  code_nation     TEXT,
  temps_ms        INTEGER,                        -- temps en millisecondes (négatif = DNS/DNF/…)
  temps_display   TEXT,                           -- formaté "1:23.45" ou "DNS"
  synced_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(competition_key, epreuve, dossard)
);

-- Lecture publique (les résultats live sont publics)
ALTER TABLE public.live_resultats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_resultats_select" ON public.live_resultats
  FOR SELECT USING (true);
