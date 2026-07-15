-- Archivage d'une compétition clôturée : la rend visible à TOUS les
-- joueurs (pas seulement ceux qui ont parié) dans l'onglet Compétitions de
-- l'app, sous forme de résultats consultables — décision explicite de
-- l'admin (pas automatique à la clôture), voir app/admin/competitions/[id]/EditClient.tsx.
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
