-- Ajoute une clé fiable pour joindre participants <-> cotes (competition_id, code_bateau).
-- Nullable : les participants ajoutés manuellement en admin (hors calculate-cotes)
-- n'auront jamais de code_bateau -> cas légitime (cotes avancées indisponibles).
ALTER TABLE participants ADD COLUMN IF NOT EXISTS code_bateau TEXT;

CREATE INDEX IF NOT EXISTS idx_participants_code_bateau ON participants(competition_id, code_bateau);
