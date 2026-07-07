ALTER TABLE public.users ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
-- Marque côté serveur la fin de l'onboarding (profil/athlète/source) — le
-- localStorage seul ne suffit pas : il ne survit pas au changement d'appareil
-- ni au contexte de stockage séparé d'une PWA installée sur iOS, ce qui
-- faisait réapparaître l'étape "comment nous as-tu connu" à chaque connexion
-- sur un nouveau device pour des comptes déjà onboardés ailleurs.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
