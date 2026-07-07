-- cotes.competition_id était NOT NULL depuis la création de la table, ce qui
-- rendait TOUT insert via saveCotes() (système course_id — /admin/cotes,
-- import PDF, Sprint Finale, Mass Start) impossible : ces lignes n'ont
-- jamais de competition_id, seulement un course_id. Chaque appel à
-- saveCotes() échouait silencieusement (erreur attrapée et juste loggée
-- par les appelants) avec "null value in column competition_id violates
-- not-null constraint".
--
-- Une ligne de cotes appartient désormais à l'UN OU L'AUTRE système
-- (course_id XOR competition_id), jamais forcément aux deux.
ALTER TABLE cotes ALTER COLUMN competition_id DROP NOT NULL;

ALTER TABLE cotes ADD CONSTRAINT cotes_course_or_competition_check
  CHECK (course_id IS NOT NULL OR competition_id IS NOT NULL);
