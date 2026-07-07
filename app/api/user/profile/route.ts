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
    .select("id, username, email, balance, avatar_url, bio, instagram_handle, onboarded_at, created_at")
    .eq("id", user.id)
    .single();

  // Si upsert ne retourne rien (ignoreDuplicates), re-fetch
  const row = profile ?? (await adminSb
    .from("users")
    .select("id, username, email, balance, avatar_url, bio, instagram_handle, onboarded_at, created_at")
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

  const { data: linkedAthleteRow } = await adminSb
    .from("athletes")
    .select("id, nom, prenom, club, categorie")
    .eq("linked_user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    id:         user.id,
    email:      user.email ?? row?.email,
    username:   row?.username ?? null,
    balance:    row?.balance ?? 1000,
    avatarUrl:  row?.avatar_url ?? null,
    bio:        row?.bio ?? "",
    instagram:  row?.instagram_handle ?? null,
    onboarded:  row?.onboarded_at != null,
    linkedAthlete: linkedAthleteRow ?? null,
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
    const username = String(body.username).trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { error: "Le pseudo doit faire 3 à 20 caractères (lettres, chiffres, underscore uniquement)" },
        { status: 400 }
      );
    }
    const { error } = await adminSb
      .from("users")
      .update({ username })
      .eq("id", user.id);
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Ce pseudo est déjà pris" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.bio != null) {
    const bio = String(body.bio).slice(0, 280);
    const { error } = await adminSb.from("users").update({ bio }).eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.avatar_url != null) {
    const avatarUrl = String(body.avatar_url);
    const expectedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/`;
    if (!avatarUrl.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "URL d'avatar invalide" }, { status: 400 });
    }
    const { error } = await adminSb.from("users").update({ avatar_url: avatarUrl }).eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.instagram != null) {
    // Accepte "@pseudo", une URL instagram.com/pseudo, ou juste "pseudo"
    let handle = String(body.instagram).trim();
    handle = handle.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "");
    if (handle && !/^[a-zA-Z0-9._]{1,30}$/.test(handle)) {
      return NextResponse.json({ error: "Pseudo Instagram invalide" }, { status: 400 });
    }
    const { error } = await adminSb.from("users").update({ instagram_handle: handle || null }).eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.onboarded === true) {
    const { error } = await adminSb.from("users").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Paramètre manquant" }, { status: 400 });
}
