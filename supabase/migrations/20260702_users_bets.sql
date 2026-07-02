-- ================================================================
-- Paris, soldes et utilisateurs — Kayakbet
-- ================================================================

-- ── 1. Table users (profil public + wallet) ─────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT,
  email      TEXT,
  balance    NUMERIC(12,2) NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ   DEFAULT now(),
  updated_at TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_balance ON public.users(balance DESC);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"  ON public.users FOR SELECT  USING (auth.uid() = id);
CREATE POLICY "users_update_own"  ON public.users FOR UPDATE  USING (auth.uid() = id);
-- service_role bypasse RLS automatiquement — pas besoin de policy admin

-- ── 2. Table bets ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bets (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  competition_id  UUID    REFERENCES public.competitions(id) ON DELETE SET NULL,
  selections      JSONB   NOT NULL,
  -- Chaque sélection : { participantId, nom, cote, competitionId, competitionNom, categorie }
  stake           NUMERIC(12,2) NOT NULL,
  cote_totale     NUMERIC(10,4) NOT NULL,
  gain_potentiel  NUMERIC(12,2) NOT NULL,
  gain_reel       NUMERIC(12,2),             -- NULL jusqu'au règlement
  status          TEXT    NOT NULL DEFAULT 'pending',
  -- pending | won | lost | void
  settled_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bets_user_id        ON public.bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_competition_id ON public.bets(competition_id);
CREATE INDEX IF NOT EXISTS idx_bets_status         ON public.bets(status);

ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bets_select_own" ON public.bets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bets_insert_own" ON public.bets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 3. Table transactions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        TEXT    NOT NULL,   -- 'bet' | 'win' | 'refund' | 'deposit'
  amount      NUMERIC(12,2) NOT NULL,  -- positif = crédit, négatif = débit
  bet_id      UUID    REFERENCES public.bets(id) ON DELETE SET NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select_own" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

-- ── 4. Fonction atomique de mise à jour du solde ─────────────────
CREATE OR REPLACE FUNCTION public.increment_user_balance(user_uuid UUID, delta NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_balance NUMERIC;
BEGIN
  UPDATE public.users
  SET balance = balance + delta, updated_at = now()
  WHERE id = user_uuid
  RETURNING balance INTO new_balance;
  RETURN new_balance;
END;
$$;

-- ── 5. Trigger : auto-créer le profil à l'inscription ────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, balance)
  VALUES (NEW.id, NEW.email, 1000)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
