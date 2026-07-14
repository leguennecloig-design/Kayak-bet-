-- Permet à l'admin de publier un classement spécifique à une compétition
-- (gains des joueurs sur les paris de CETTE compétition), affiché comme
-- option dans la page Classement générale de l'app.
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS leaderboard_visible BOOLEAN NOT NULL DEFAULT false;
