import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-server";

// GET /api/user/profile
// Retourne profil + solde + stats de l'utilisateur connecté.
// Crée automatiquement la ligne users si elle n'existe pas (premiers accès).
export async function GET() {
  const supabase  = createServerSupabase();
  const adminSb   = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  // Upsert : crée le profil si absent (ex: inscriptions antérieures au trigger)
  const { data: profile, error } = await adminSb
    .from("users")
    .upsert({ id: user.id, email: user.email }, { onConflict: "id", ignoreDuplicates: true })
    .select("id, username, email, balance, created_at")
    .eq("id", user.id)
    .single();

  // Si upsert ne retourne rien (ignoreDuplicates), re-fetch
  const row = profile ?? (await adminSb
    .from("users")
    .select("id, username, email, balance, created_at")
    .eq("id", user.id)
    .single()
  ).data;

  if (!row && error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Stats paris
  const { data: betStats } = await adminSb
    .from("bets")
    .select("status, gain_reel")
    .eq("user_id", user.id);

  const totalBets   = betStats?.length ?? 0;
  const wonBets     = betStats?.filter(b => b.status === "won").length ?? 0;
  const pendingBets = betStats?.filter(b => b.status === "pending").length ?? 0;
  const totalWon    = betStats?.filter(b => b.status === "won")
    .reduce((sum, b) => sum + (b.gain_reel ?? 0), 0) ?? 0;

  return NextResponse.json({
    id:         user.id,
    email:      user.email ?? row?.email,
    username:   row?.username ?? null,
    balance:    row?.balance ?? 1000,
    created_at: row?.created_at,
    stats: {
      totalBets,
      wonBets,
      pendingBets,
      winRate: totalBets > 0 ? Math.round((wonBets / totalBets) * 100) : 0,
      totalWon,
    },
  });
}

// PATCH /api/user/profile
// { deposit: number }   → recharge le solde (démo, pas de vrai paiement)
// { username: string }  → change le pseudo
export async function PATCH(req: NextRequest) {
  const supabase = createServerSupabase();
  const adminSb  = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await req.json();

  if (body.deposit != null) {
    const amount = Math.min(Math.max(Number(body.deposit) || 0, 1), 5000);
    const { data: newBal } = await adminSb.rpc("increment_user_balance", {
      user_uuid: user.id,
      delta: amount,
    });
    // Créer une transaction de dépôt
    await adminSb.from("transactions").insert({
      user_id:     user.id,
      type:        "deposit",
      amount:      amount,
      description: `Dépôt de ${amount} crédits`,
    });
    return NextResponse.json({ balance: newBal ?? amount });
  }

  if (body.username != null) {
    const { error } = await adminSb
      .from("users")
      .update({ username: String(body.username).slice(0, 30) })
      .eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Paramètre manquant" }, { status: 400 });
}
