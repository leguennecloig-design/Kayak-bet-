import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";

// Récompense Instagram (500 cr) AVEC validation manuelle par l'admin.
// Le joueur soumet son @pseudo → statut "pending" → l'admin vérifie qu'il
// est réellement abonné et approuve (crédit) ou refuse.
//
// Nécessite la migration 20260720 (colonnes instagram_reward_status/handle/
// requested_at). Si elle n'est pas appliquée, on dégrade proprement
// (status "unavailable") sans jamais faire planter le reste de l'app.

const HANDLE_RE = /^[a-zA-Z0-9._]{1,30}$/;

function normalizeHandle(raw: string): string {
  return String(raw)
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
}

// GET — statut de la demande du joueur connecté.
export async function GET() {
  const supabase = createServerSupabase();
  const adminSb  = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { data, error } = await adminSb
    .from("users")
    .select("instagram_reward_status, instagram_reward_handle, instagram_reward_claimed_at")
    .eq("id", user.id)
    .maybeSingle();

  // Colonne absente (migration non appliquée) → fonctionnalité en pause.
  if (error) return NextResponse.json({ status: "unavailable" });

  // Compat : un ancien claim direct (claimed_at rempli sans status) = approuvé.
  const status =
    data?.instagram_reward_status ??
    (data?.instagram_reward_claimed_at ? "approved" : "none");

  return NextResponse.json({ status, handle: data?.instagram_reward_handle ?? null });
}

// POST { handle } — crée/renvoie la demande "en attente".
export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const adminSb  = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const handle = normalizeHandle(body?.handle ?? "");
  if (!handle || !HANDLE_RE.test(handle)) {
    return NextResponse.json({ error: "Pseudo Instagram invalide" }, { status: 400 });
  }

  const { data: current, error: readErr } = await adminSb
    .from("users")
    .select("instagram_reward_status, instagram_reward_claimed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (readErr) {
    // Migration non appliquée
    return NextResponse.json({ error: "Récompense temporairement indisponible" }, { status: 503 });
  }

  const status = current?.instagram_reward_status;
  if (status === "approved" || current?.instagram_reward_claimed_at) {
    return NextResponse.json({ ok: false, reason: "already_approved", status: "approved" });
  }
  if (status === "pending") {
    return NextResponse.json({ ok: true, status: "pending" });
  }

  const { error: upErr } = await adminSb
    .from("users")
    .update({
      instagram_reward_status:       "pending",
      instagram_reward_handle:       handle,
      instagram_reward_requested_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, status: "pending" });
}
