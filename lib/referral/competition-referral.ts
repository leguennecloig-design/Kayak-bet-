// Logique partagée d'enregistrement d'un parrainage lié à une compétition —
// utilisée à la fois par POST /api/referral/apply (lien /c/[id]?ref=CODE,
// capturé à l'inscription/connexion) et par POST /api/competitions/[id]/referral
// (saisie manuelle du code depuis l'écran de la compétition). Ne verse jamais
// le bonus ici : seul le premier pari du filleul sur cette compétition le
// déclenche (voir POST /api/user/bets).

import type { createAdminSupabase } from "@/lib/supabase-server";

type AdminSupabase = ReturnType<typeof createAdminSupabase>;

export type RegisterResult =
  | { ok: true }
  | { ok: false; reason: "invalid_code" | "self_referral" };

export async function registerCompetitionReferral(
  adminSb: AdminSupabase,
  code: string,
  referredUserId: string,
  competitionId: string
): Promise<RegisterResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { ok: false, reason: "invalid_code" };

  const { data: referrer } = await adminSb
    .from("users")
    .select("id")
    .eq("referral_code", trimmed)
    .maybeSingle();

  if (!referrer) return { ok: false, reason: "invalid_code" };
  if (referrer.id === referredUserId) return { ok: false, reason: "self_referral" };

  // Un seul lien de compétition "en attente" par filleul à la fois — un
  // nouveau code (même compétition ou une autre) remplace le précédent.
  // Sans risque de double-crédit : le versement du bonus (voir
  // POST /api/user/bets) exige en plus qu'aucun pari antérieur du filleul
  // ne référence déjà cette compétition, quel que soit l'état de cette ligne.
  await adminSb
    .from("competition_referrals")
    .upsert(
      { referrer_id: referrer.id, referred_id: referredUserId, competition_id: competitionId, rewarded_at: null },
      { onConflict: "referred_id" }
    );

  return { ok: true };
}
