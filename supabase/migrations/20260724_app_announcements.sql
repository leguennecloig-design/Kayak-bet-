-- Annonces de mise à jour affichées aux joueurs (pop-up "Nouvelle version
-- disponible"), gérées depuis l'admin. Une seule annonce "active" à la fois
-- fait foi ; les précédentes restent en historique (created_at desc).
CREATE TABLE IF NOT EXISTS app_announcements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  version     TEXT        NOT NULL,
  title       TEXT        NOT NULL DEFAULT 'Nouvelle version disponible',
  changelog   JSONB       NOT NULL DEFAULT '[]'::jsonb, -- tableau de chaînes (une ligne par nouveauté)
  cta_label   TEXT,
  cta_url     TEXT,
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_announcements_active ON app_announcements(active, created_at DESC);

ALTER TABLE app_announcements ENABLE ROW LEVEL SECURITY;

-- Public : lecture seule de l'annonce active la plus récente (le "vu" est
-- géré côté client par version, pas besoin de policy par utilisateur).
CREATE POLICY "Public peut lire les annonces actives"
  ON app_announcements FOR SELECT
  USING (active = true);
