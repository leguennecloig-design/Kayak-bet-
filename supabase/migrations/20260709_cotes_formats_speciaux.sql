-- La table cotes gère deux systèmes en parallèle : l'ancien (course_id,
-- résultats FFCK officiels scrapés) et le nouveau (competition_id,
-- inscriptions). Le système course_id référence bien ffck_courses mais la
-- colonne n'existait pas encore — le bouton "Recalculer" de /admin/cotes
-- était donc cassé (aucune ligne n'a jamais été sauvegardée avec succès,
-- table cotes vide au moment de cette migration).
ALTER TABLE cotes ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES ffck_courses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cotes_course ON cotes(course_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cotes_course_code_bateau_unique'
  ) THEN
    ALTER TABLE cotes ADD CONSTRAINT cotes_course_code_bateau_unique UNIQUE (course_id, code_bateau);
  END IF;
END $$;

-- Format du calcul : standard (algo v3 seul) / sprint_finale (60% qualifs +
-- 40% v3) / mass_start (80% classique du WE + 20% v3).
ALTER TABLE cotes ADD COLUMN IF NOT EXISTS format_course TEXT DEFAULT 'standard';
COMMENT ON COLUMN cotes.format_course IS 'Format du calcul: standard / sprint_finale / mass_start';
