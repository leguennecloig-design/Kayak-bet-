import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { notifyUser } from "@/lib/notifications/create";

const INSTAGRAM_REWARD = 500;

// GET /api/admin/instagram-requests — liste les demandes de bonus Instagram
// en attente de validation (le plus ancien d'abord).
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const adminSb = createAdminSupabase();
  const { data, error } = await adminSb
    .from("users")
    .select("id, username, email, instagram_reward_handle, instagram_reward_requested_at")
    .eq("instagram_reward_status", "pending")
    .order("instagram_reward_requested_at", { ascending: true });

  if (error) {
    // Migration 20260720 non appliquée
    return NextResponse.json({ requests: [], unavailable: true });
  }

  return NextResponse.json({
    requests: (data ?? []).map(u => ({
      userId:      u.id,
      username:    u.username ?? null,
      email:       u.email ?? null,
      handle:      u.instagram_reward_handle ?? null,
      requestedAt: u.instagram_reward_requested_at ?? null,
    })),
  });
}

// POST /api/admin/instagram-requests { userId, action: "approve" | "reject" }
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const adminSb = createAdminSupabase();
  const body = await req.json().catch(() => ({}));
  const userId = String(body?.userId ?? "");
  const action = body?.action;
  if (!userId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  // On ne traite que les demandes réellement "pending" (évite double crédit).
  const { data: current, error: readErr } = await adminSb
    .from("users")
    .select("instagram_reward_status")
    .eq("id", userId)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (current?.instagram_reward_status !== "pending") {
    return NextResponse.json({ error: "Cette demande n'est plus en attente" }, { status: 409 });
  }

  if (action === "reject") {
    const { error } = await adminSb
      .from("users")
      .update({ instagram_reward_status: "rejected" })
      .eq("id", userId)
      .eq("instagram_reward_status", "pending");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await notifyUser(adminSb, userId, {
      type: "instagram_reward_rejected",
      title: "Bonus Instagram refusé",
      body: "Ton abonnement n'a pas pu être vérifié. Vérifie que tu suis bien @kayakbet puis renvoie ta demande depuis ton profil.",
      url: "/app",
    });
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // approve : marquer approuvé de façon atomique (garde WHERE status=pending)
  // AVANT de créditer, pour ne jamais créditer deux fois.
  const { data: approved, error: approveErr } = await adminSb
    .from("users")
    .update({
      instagram_reward_status:     "approved",
      instagram_reward_claimed_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .eq("instagram_reward_status", "pending")
    .select("id")
    .maybeSingle();
  if (approveErr) return NextResponse.json({ error: approveErr.message }, { status: 500 });
  if (!approved) {
    return NextResponse.json({ error: "Demande déjà traitée" }, { status: 409 });
  }

  const { error: balErr } = await adminSb.rpc("increment_user_balance", {
    user_uuid: userId,
    delta:     INSTAGRAM_REWARD,
  });
  if (balErr) return NextResponse.json({ error: balErr.message }, { status: 500 });

  await adminSb.from("transactions").insert({
    user_id:     userId,
    type:        "instagram_reward",
    amount:      INSTAGRAM_REWARD,
    description: "Bonus Instagram — abonnement vérifié",
  });

  await notifyUser(adminSb, userId, {
    type: "instagram_reward_approved",
    title: "Bonus Instagram approuvé 🎉",
    body: `Ton abonnement Instagram a été vérifié — +${INSTAGRAM_REWARD} crédits !`,
    url: "/app",
  });

  return NextResponse.json({ ok: true, status: "approved", bonus: INSTAGRAM_REWARD });
}
