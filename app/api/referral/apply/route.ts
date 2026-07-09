import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";

const REFERRAL_BONUS = 200;

// POST /api/referral/apply { code } — applique un code de parrainage à
// l'utilisateur connecté (une seule fois par compte). Crédite le parrain
// ET le filleul de REFERRAL_BONUS crédits chacun.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const adminSb  = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  const trimmed = String(code ?? "").trim().toUpperCase();
  if (!trimmed) return NextResponse.json({ ok: false, reason: "no_code" });

  const { data: me } = await adminSb
    .from("users")
    .select("id, referred_by")
    .eq("id", user.id)
    .single();

  // Idempotent : un compte ne peut être parrainé qu'une fois.
  if (me?.referred_by) {
    return NextResponse.json({ ok: false, reason: "already_referred" });
  }

  const { data: referrer } = await adminSb
    .from("users")
    .select("id")
    .eq("referral_code", trimmed)
    .maybeSingle();

  if (!referrer || referrer.id === user.id) {
    return NextResponse.json({ ok: false, reason: "invalid_code" });
  }

  const { error: updateErr } = await adminSb
    .from("users")
    .update({ referred_by: referrer.id })
    .eq("id", user.id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  await adminSb.rpc("increment_user_balance", { user_uuid: referrer.id, delta: REFERRAL_BONUS });
  await adminSb.rpc("increment_user_balance", { user_uuid: user.id, delta: REFERRAL_BONUS });

  await adminSb.from("transactions").insert([
    {
      user_id: referrer.id,
      type: "referral_bonus",
      amount: REFERRAL_BONUS,
      description: "Parrainage — un ami a rejoint Kayakbet grâce à toi",
    },
    {
      user_id: user.id,
      type: "referral_bonus",
      amount: REFERRAL_BONUS,
      description: "Parrainage — bonus de bienvenue",
    },
  ]);

  return NextResponse.json({ ok: true, bonus: REFERRAL_BONUS });
}
