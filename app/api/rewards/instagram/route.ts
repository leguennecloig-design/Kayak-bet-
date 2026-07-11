import { NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";

const INSTAGRAM_REWARD = 500;

// POST /api/rewards/instagram — crédite 500 crédits pour l'abonnement au
// compte Instagram Kayakbet. Une seule fois par compte (basé sur la parole
// de l'utilisateur, pas de vérification Instagram réelle).
export async function POST() {
  const supabase = createServerSupabase();
  const adminSb  = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  // Mise à jour atomique conditionnée à `IS NULL` : élimine la course entre
  // deux requêtes concurrentes (même pattern que /api/referral/apply).
  const { data: updated, error: updateErr } = await adminSb
    .from("users")
    .update({ instagram_reward_claimed_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("instagram_reward_claimed_at", null)
    .select("id")
    .maybeSingle();
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json({ ok: false, reason: "already_claimed" });
  }

  const { data: newBalance } = await adminSb.rpc("increment_user_balance", {
    user_uuid: user.id,
    delta: INSTAGRAM_REWARD,
  });

  await adminSb.from("transactions").insert({
    user_id:     user.id,
    type:        "instagram_reward",
    amount:      INSTAGRAM_REWARD,
    description: "Bonus Instagram — abonnement au compte Kayakbet",
  });

  return NextResponse.json({ ok: true, bonus: INSTAGRAM_REWARD, balance: Number(newBalance) });
}
