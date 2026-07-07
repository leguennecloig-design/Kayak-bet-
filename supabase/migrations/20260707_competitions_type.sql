ALTER TABLE competitions ADD COLUMN IF NOT EXISTS type_competition TEXT;
ALTER TABLE competitions
  ADD CONSTRAINT competitions_type_competition_check
  CHECK (type_competition IS NULL OR type_competition IN ('sprint', 'classique'));
