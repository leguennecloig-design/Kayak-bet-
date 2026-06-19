-- =====================================================
-- Kayakbet — Schéma FFCK
-- À coller et exécuter dans Supabase SQL Editor
-- =====================================================

-- 1. ATHLETES
-- =====================================================
CREATE TABLE IF NOT EXISTS athletes (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_bateau           TEXT UNIQUE NOT NULL,
  nom                   TEXT NOT NULL,
  prenom                TEXT,
  club                  TEXT,
  categorie             TEXT NOT NULL,
  code_embarcation      TEXT NOT NULL,
  age_categorie         TEXT,
  sexe                  TEXT,
  rang_national         INTEGER,
  points_classement     NUMERIC,
  nb_courses_classement INTEGER,
  saison                INTEGER DEFAULT 2026,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FFCK_COMPETITIONS
-- Note : la table "competitions" existante est réservée aux paris Kayakbet.
-- =====================================================
CREATE TABLE IF NOT EXISTS ffck_competitions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code_ffck       INTEGER UNIQUE NOT NULL,
  nom             TEXT NOT NULL,
  ville           TEXT,
  riviere         TEXT,
  date_debut      DATE NOT NULL,
  date_fin        DATE,
  code_niveau     TEXT NOT NULL,
  code_type       TEXT,
  est_national    BOOLEAN GENERATED ALWAYS AS (code_niveau = 'NAT') STORED,
  nb_courses      INTEGER DEFAULT 0,
  nb_participants INTEGER DEFAULT 0,
  annee           INTEGER NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FFCK_COURSES
-- =====================================================
CREATE TABLE IF NOT EXISTS ffck_courses (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id   UUID NOT NULL REFERENCES ffck_competitions(id) ON DELETE CASCADE,
  code_course      INTEGER NOT NULL,
  libelle          TEXT NOT NULL,
  date_course      DATE,
  code_type_course TEXT,
  nb_participants  INTEGER DEFAULT 0,
  nb_categories    INTEGER DEFAULT 0,
  synced_at        TIMESTAMPTZ,
  UNIQUE(competition_id, code_course)
);

-- 4. FFCK_RESULTATS
-- =====================================================
CREATE TABLE IF NOT EXISTS ffck_resultats (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id      UUID NOT NULL REFERENCES ffck_courses(id) ON DELETE CASCADE,
  athlete_id     UUID REFERENCES athletes(id) ON DELETE SET NULL,
  code_bateau    TEXT NOT NULL,
  rang           INTEGER,
  categorie      TEXT NOT NULL,
  temps_chrono   INTEGER,
  temps_secondes NUMERIC GENERATED ALWAYS AS (temps_chrono::numeric / 1000) STORED,
  points         NUMERIC,
  dsq            BOOLEAN DEFAULT FALSE,
  coureur1_nom    TEXT,
  coureur1_prenom TEXT,
  coureur1_club   TEXT,
  coureur2_nom    TEXT,
  coureur2_prenom TEXT,
  coureur2_club   TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, code_bateau, categorie)
);

CREATE INDEX IF NOT EXISTS idx_resultats_code_bateau  ON ffck_resultats(code_bateau);
CREATE INDEX IF NOT EXISTS idx_resultats_categorie    ON ffck_resultats(categorie);
CREATE INDEX IF NOT EXISTS idx_resultats_athlete_id   ON ffck_resultats(athlete_id);
CREATE INDEX IF NOT EXISTS idx_competitions_annee     ON ffck_competitions(annee);
CREATE INDEX IF NOT EXISTS idx_courses_synced         ON ffck_courses(synced_at) WHERE synced_at IS NULL;

-- 5. VUE HISTORIQUE
-- =====================================================
CREATE OR REPLACE VIEW v_historique_athlete AS
SELECT
  r.code_bateau,
  a.nom,
  a.prenom,
  a.categorie,
  a.rang_national,
  a.points_classement,
  c.nom        AS competition_nom,
  c.date_debut,
  c.est_national,
  co.libelle   AS type_course,
  r.rang,
  r.temps_secondes,
  r.points,
  r.dsq
FROM ffck_resultats r
LEFT JOIN athletes a       ON r.athlete_id    = a.id
JOIN ffck_courses  co      ON r.course_id     = co.id
JOIN ffck_competitions c   ON co.competition_id = c.id
ORDER BY r.code_bateau, c.date_debut DESC;

-- 6. RLS
-- =====================================================
ALTER TABLE athletes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ffck_competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ffck_courses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ffck_resultats    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique athletes"           ON athletes          FOR SELECT USING (true);
CREATE POLICY "Lecture publique ffck_competitions"  ON ffck_competitions FOR SELECT USING (true);
CREATE POLICY "Lecture publique ffck_courses"       ON ffck_courses      FOR SELECT USING (true);
CREATE POLICY "Lecture publique ffck_resultats"     ON ffck_resultats    FOR SELECT USING (true);
