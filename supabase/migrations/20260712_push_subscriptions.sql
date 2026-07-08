-- Abonnements push (Web Push API) — un utilisateur peut avoir plusieurs
-- abonnements (un par appareil/navigateur). Les routes serveur qui envoient
-- des notifications utilisent createAdminSupabase() (service_role bypasse
-- RLS), comme partout ailleurs dans ce repo — ces policies sont pour les
-- opérations faites depuis le navigateur du joueur (souscrire/se désinscrire).
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_select_own" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "push_subscriptions_insert_own" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_subscriptions_delete_own" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);
