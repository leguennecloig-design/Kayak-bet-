-- Résultat de qualification par athlète, pour une compétition QUALIF (voir
-- competitions.marche_qualif_finale) — remplace le calcul rang<=quota par un
-- import direct de la liste des qualifiés (voir lib/algo/qualif-results-parser.ts) :
-- NULL = pas encore réglé, true = qualifié pour la finale, false = non qualifié.
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS qualified_finale BOOLEAN;

-- Absent à la manche de qualification — neutre au règlement (ni gagné ni
-- perdu), comme dns pour les résultats normaux (voir close/route.ts).
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS dns BOOLEAN NOT NULL DEFAULT false;
