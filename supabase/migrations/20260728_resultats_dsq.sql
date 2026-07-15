-- Statut "Disqualifié" (Dsq), distinct de dns (Absent) et dnf (Abandon) —
-- voir app/api/admin/competitions/[id]/close/route.ts : Dsq/Dnf = perte
-- sèche pour les paris sur cet athlète, Dns = neutre (void, cote à 1).
ALTER TABLE public.resultats ADD COLUMN IF NOT EXISTS dsq BOOLEAN DEFAULT false;
