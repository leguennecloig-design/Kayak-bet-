CREATE TABLE IF NOT EXISTS public.leagues (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  invite_code    TEXT NOT NULL UNIQUE,
  creator_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  current_season INT NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- season_start_balance = solde du membre au début de la saison en cours
-- (au moment où il a rejoint, ou reset au moment d'une nouvelle saison) —
-- le classement de la ligue se base sur le GAIN depuis ce point, pas le
-- solde brut, pour que rejoindre en cours de saison reste équitable.
CREATE TABLE IF NOT EXISTS public.league_members (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id            UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  season_start_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  joined_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE (league_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_league_members_league ON public.league_members(league_id);
CREATE INDEX IF NOT EXISTS idx_league_members_user   ON public.league_members(user_id);

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

-- Lecture publique (même logique que le classement général) ; écriture via
-- les routes API (service role) avec vérification créateur/membre en code,
-- ces policies servent de défense en profondeur.
CREATE POLICY "leagues_select_all" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "leagues_insert_own" ON public.leagues FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "leagues_update_own" ON public.leagues FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "leagues_delete_own" ON public.leagues FOR DELETE USING (auth.uid() = creator_id);

CREATE POLICY "league_members_select_all" ON public.league_members FOR SELECT USING (true);
CREATE POLICY "league_members_insert_own" ON public.league_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "league_members_delete_own" ON public.league_members FOR DELETE USING (auth.uid() = user_id);
