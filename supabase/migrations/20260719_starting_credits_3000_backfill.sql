-- Solde de départ à 3000 crédits — filet de rattrapage.
-- La migration 20260716 fixait déjà le défaut + le trigger à 3000, mais si
-- elle n'a pas été appliquée (ou avant elle), des comptes ont pu être créés
-- avec l'ancien montant (1000/1200). Ce script est idempotent : on peut le
-- rejouer sans risque.

-- 1. Défaut de colonne
ALTER TABLE public.users ALTER COLUMN balance SET DEFAULT 3000;

-- 2. Trigger de création de compte (recrée handle_new_user avec 3000)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, balance, referral_code)
  VALUES (NEW.id, NEW.email, 3000, public.generate_referral_code())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Rattrapage des comptes tout neufs restés à un ancien montant de départ
--    (jamais onboardés, aucun pari, aucune transaction) → 3000.
UPDATE public.users u
SET balance = 3000
WHERE u.onboarded_at IS NULL
  AND u.balance IN (1000, 1200)
  AND NOT EXISTS (SELECT 1 FROM public.bets b WHERE b.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM public.transactions t WHERE t.user_id = u.id);
