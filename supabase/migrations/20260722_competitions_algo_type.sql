-- Choix explicite de l'algo de cotes à la création d'une compétition (v4).
-- Remplace la détection implicite (nom / discipline texte libre). L'admin
-- choisit : sprint | classique | mass_start | sprint_finale.
-- Nullable pour la rétrocompat (anciennes compétitions), mais obligatoire
-- dans les formulaires admin à partir de maintenant.
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS algo_type TEXT
  CHECK (algo_type IN ('sprint', 'classique', 'mass_start', 'sprint_finale'));

-- Rétro-remplissage best-effort depuis type_competition existant.
UPDATE public.competitions
SET algo_type = type_competition
WHERE algo_type IS NULL
  AND type_competition IN ('sprint', 'classique', 'mass_start', 'sprint_finale');
