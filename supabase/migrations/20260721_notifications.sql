-- Notifications sur le site (cloche + liste) — en complément des push.
-- Destinataire = user_id. Créées uniquement par les routes serveur (service
-- role). Événements entre joueurs : demande d'ami, ami accepté, filleul via
-- lien de parrainage.
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,            -- 'friend_request' | 'friend_accepted' | 'referral_used'
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  url        TEXT,                      -- lien in-app (ex: /app)
  actor_id   UUID REFERENCES public.users(id) ON DELETE SET NULL, -- l'autre joueur concerné
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Le joueur lit et marque comme lues SES notifications. Aucune policy d'INSERT :
-- seules les routes serveur (service role, qui ignore RLS) en créent.
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
