-- Système de parrainage : chaque utilisateur a un code unique à partager
-- (même alphabet/longueur que les codes de ligue), et referred_by garde
-- trace de qui l'a parrainé (une seule fois, jamais réassignable).
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id);

CREATE OR REPLACE FUNCTION public.generate_referral_code() RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.users WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

-- Backfill des comptes déjà créés avant ce chantier
UPDATE public.users SET referral_code = public.generate_referral_code() WHERE referral_code IS NULL;

-- handle_new_user() étendu pour générer le code dès la création du compte
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, balance, referral_code)
  VALUES (NEW.id, NEW.email, 1000, public.generate_referral_code())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
