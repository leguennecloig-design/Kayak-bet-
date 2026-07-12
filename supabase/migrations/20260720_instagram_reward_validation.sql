-- Récompense Instagram avec validation manuelle par l'admin.
-- Le joueur soumet son @pseudo → statut "pending" → l'admin vérifie qu'il
-- est bien abonné et approuve (crédit 500) ou refuse. Idempotent.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS instagram_reward_status        TEXT;         -- null | 'pending' | 'approved' | 'rejected'
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS instagram_reward_handle        TEXT;         -- @pseudo soumis
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS instagram_reward_requested_at  TIMESTAMPTZ;
-- instagram_reward_claimed_at existe déjà (20260716) : rempli à l'approbation.

CREATE INDEX IF NOT EXISTS idx_users_ig_reward_pending
  ON public.users (instagram_reward_requested_at)
  WHERE instagram_reward_status = 'pending';
