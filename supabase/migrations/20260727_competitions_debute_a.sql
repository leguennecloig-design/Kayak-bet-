-- Heure de début précise d'une compétition (distincte de `paris_ouverts_a`,
-- qui est l'heure d'OUVERTURE des paris, généralement bien avant). Sert de
-- coupe-circuit dur : passé ce moment, plus aucun pari/modif/annulation de
-- coupon n'est accepté sur cette compétition (voir lib/bets/validate-selections.ts).
-- Nullable : tant que l'admin ne l'a pas renseignée, le code se rabat sur
-- `date` (granularité jour) pour protéger quand même les compétitions déjà publiées.
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS debute_a TIMESTAMPTZ;
