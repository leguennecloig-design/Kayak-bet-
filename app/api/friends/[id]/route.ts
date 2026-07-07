import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";

// PATCH /api/friends/[id] { action: "accept" | "decline" }
// Seul le destinataire d'une demande en attente peut l'accepter/refuser.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase();
  const adminSb = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { action } = await req.json();
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "action invalide" }, { status: 400 });
  }

  const { data: row } = await adminSb
    .from("friendships")
    .select("id, user_low, user_high, requested_by, status")
    .eq("id", params.id)
    .maybeSingle();

  if (!row || (row.user_low !== user.id && row.user_high !== user.id)) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }
  if (row.status !== "pending") {
    return NextResponse.json({ error: "Cette demande n'est plus en attente" }, { status: 409 });
  }
  if (row.requested_by === user.id) {
    return NextResponse.json({ error: "Seul le destinataire peut répondre à la demande" }, { status: 403 });
  }

  const { error } = await adminSb
    .from("friendships")
    .update({ status: action === "accept" ? "accepted" : "declined", updated_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, status: action === "accept" ? "friends" : "declined" });
}

// DELETE /api/friends/[id] — annule une demande sortante en attente, ou
// supprime une amitié acceptée. Les deux parties peuvent le faire.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase();
  const adminSb = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { data: row } = await adminSb
    .from("friendships")
    .select("id, user_low, user_high")
    .eq("id", params.id)
    .maybeSingle();

  if (!row || (row.user_low !== user.id && row.user_high !== user.id)) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const { error } = await adminSb.from("friendships").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
