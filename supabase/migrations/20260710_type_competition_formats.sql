-- Étend le type de compétition pour couvrir les 4 formats de calcul de cotes :
-- sprint (normal), classique, mass_start, sprint_finale.
ALTER TABLE competitions DROP CONSTRAINT IF EXISTS competitions_type_competition_check;
ALTER TABLE competitions
  ADD CONSTRAINT competitions_type_competition_check
  CHECK (type_competition IS NULL OR type_competition IN ('sprint', 'classique', 'mass_start', 'sprint_finale'));
