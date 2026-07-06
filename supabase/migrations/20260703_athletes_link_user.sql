DO $$ BEGIN
  IF to_regclass('public.athletes') IS NULL THEN
    RAISE EXCEPTION 'Table athletes introuvable — vérifier scripts/db/01_create_tables.sql';
  END IF;
END $$;

ALTER TABLE athletes ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_athletes_linked_user_unique
  ON athletes(linked_user_id) WHERE linked_user_id IS NOT NULL;

-- RPC atomique : seule voie d'écriture sur linked_user_id (pas de policy RLS
-- UPDATE générique, qui autoriserait la modification d'autres colonnes).
CREATE OR REPLACE FUNCTION public.claim_athlete(athlete_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID := auth.uid();
  already_linked UUID;
  caller_existing UUID;
BEGIN
  IF caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT id INTO caller_existing FROM athletes WHERE linked_user_id = caller_id;
  IF caller_existing IS NOT NULL AND caller_existing <> athlete_uuid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_linked_other');
  END IF;

  -- Verrou anti-course entre deux revendications simultanées du même athlète
  SELECT linked_user_id INTO already_linked
  FROM athletes WHERE id = athlete_uuid FOR UPDATE;

  IF already_linked IS NOT NULL AND already_linked <> caller_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END IF;

  UPDATE athletes SET linked_user_id = caller_id, updated_at = now()
  WHERE id = athlete_uuid;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_athlete(UUID) TO authenticated;
