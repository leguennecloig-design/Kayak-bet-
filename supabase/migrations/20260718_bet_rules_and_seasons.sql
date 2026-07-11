-- Règles de paris + saisons (2026-07-11)

-- 1. Plancher de solde paramétrable sur le débit de mise : en plus d'être
-- conditionné à "balance >= amount" (déjà atomique, migration 20260714),
-- on ajoute un plancher optionnel (par défaut 0, rétrocompatible avec les
-- appels existants) pour empêcher de miser au point de passer sous un
-- solde minimum (200 crédits — voir app/api/user/bets).
CREATE OR REPLACE FUNCTION public.decrement_balance_if_sufficient(
  user_uuid UUID,
  amount NUMERIC,
  floor_balance NUMERIC DEFAULT 0
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_balance NUMERIC;
BEGIN
  UPDATE public.users
  SET balance = balance - amount, updated_at = now()
  WHERE id = user_uuid AND balance - amount >= floor_balance
  RETURNING balance INTO new_balance;
  RETURN new_balance; -- NULL si le solde ne suffit pas à rester au-dessus du plancher
END;
$$;

-- 2. Saisons du classement général — une nouvelle saison remet tous les
-- soldes au montant de départ (3000cr) et redémarre le classement à zéro.
CREATE TABLE IF NOT EXISTS public.seasons (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label      TEXT NOT NULL,             -- ex: "Saison 2026"
  is_current BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Une seule saison "courante" à la fois.
CREATE UNIQUE INDEX IF NOT EXISTS seasons_only_one_current
  ON public.seasons (is_current)
  WHERE is_current;

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- Lecture publique (affichage du libellé "Saison 2026" sur le classement) ;
-- écriture réservée au client admin (service role, qui ignore RLS de toute
-- façon) — donc aucune policy INSERT/UPDATE pour authenticated/anon.
CREATE POLICY "seasons_select_all" ON public.seasons FOR SELECT USING (true);

-- Saison initiale correspondant à l'état actuel de l'app, pour qu'il y ait
-- toujours une saison "courante" définie.
INSERT INTO public.seasons (label, is_current)
SELECT 'Saison 2026', true
WHERE NOT EXISTS (SELECT 1 FROM public.seasons);
