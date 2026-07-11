-- Permet de programmer une heure d'ouverture des paris distincte de la
-- publication de la compétition : la compétition peut apparaître (status
-- "published") avant que la startlist/les paris soient réellement
-- accessibles. NULL = ouverture immédiate dès la publication (comportement
-- actuel inchangé, rétrocompatible).
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS paris_ouverts_a TIMESTAMPTZ;
