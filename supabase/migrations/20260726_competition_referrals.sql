-- ================================================================
-- Parrainage lié à une compétition — lien du type /c/[competitionId]?ref=CODE
-- Contrairement au parrainage général (bonus au moment de l'inscription),
-- ici le bonus de 200 cr (parrain + filleul) n'est versé que lorsque le
-- filleul place son PREMIER pari sur CETTE compétition précise — pour
-- éviter de récompenser un compte créé sans jamais parier.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.competition_referrals (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id    UUID    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_id    UUID    NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  competition_id UUID    NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  rewarded_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Un seul lien de compétition "en attente" par filleul à la fois : un
-- nouveau clic sur un lien (autre compétition, ou même) remplace le
-- précédent tant qu'il n'a pas encore été récompensé (voir upsert côté API).
CREATE INDEX IF NOT EXISTS idx_competition_referrals_referrer    ON public.competition_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_competition_referrals_competition ON public.competition_referrals(competition_id);

ALTER TABLE public.competition_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competition_referrals_select_own" ON public.competition_referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
-- service_role (admin client) bypasse RLS pour l'écriture — pas de policy INSERT/UPDATE nécessaire
