-- Réglages avant lancement (2026-07-11) :
-- - Solde de départ des nouveaux comptes : 1000 -> 3000 crédits.
-- - Bonus de parrainage : 200 -> 400 crédits (voir app/api/referral/apply).
-- - Nouvelle récompense ponctuelle : 500 crédits pour l'abonnement Instagram.

ALTER TABLE public.users ALTER COLUMN balance SET DEFAULT 3000;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, balance, referral_code)
  VALUES (NEW.id, NEW.email, 3000, public.generate_referral_code())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Récompense Instagram : une seule fois par compte (NULL = pas encore
-- réclamée). Basé sur la parole de l'utilisateur (pas de vérification API
-- Instagram réelle) — cohérent avec le reste de l'app (crédits fictifs).
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS instagram_reward_claimed_at TIMESTAMPTZ;
