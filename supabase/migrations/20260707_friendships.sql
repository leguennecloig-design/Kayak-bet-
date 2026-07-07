CREATE TABLE IF NOT EXISTS public.friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_low     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_high    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | declined
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT friendships_pair_check CHECK (user_low < user_high),
  CONSTRAINT friendships_requester_check CHECK (requested_by = user_low OR requested_by = user_high),
  CONSTRAINT friendships_status_check CHECK (status IN ('pending', 'accepted', 'declined')),
  UNIQUE (user_low, user_high)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_low  ON public.friendships(user_low);
CREATE INDEX IF NOT EXISTS idx_friendships_user_high ON public.friendships(user_high);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friendships_select_own" ON public.friendships FOR SELECT
  USING (auth.uid() = user_low OR auth.uid() = user_high);
CREATE POLICY "friendships_insert_own" ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requested_by AND (auth.uid() = user_low OR auth.uid() = user_high));
CREATE POLICY "friendships_update_own" ON public.friendships FOR UPDATE
  USING (auth.uid() = user_low OR auth.uid() = user_high);
CREATE POLICY "friendships_delete_own" ON public.friendships FOR DELETE
  USING (auth.uid() = user_low OR auth.uid() = user_high);
