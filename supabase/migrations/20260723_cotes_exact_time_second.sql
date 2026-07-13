-- Nouveau pari "temps à la seconde" (v4) — cote plafonnée à 4.
-- Colonne stockée dans la table des cotes (peuplée par l'algo v4).
ALTER TABLE public.cotes
  ADD COLUMN IF NOT EXISTS cote_exact_time_second NUMERIC;
