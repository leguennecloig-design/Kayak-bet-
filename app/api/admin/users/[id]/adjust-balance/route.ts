import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";

// POST /api/admin/users/[id]/adjust-balance { delta, reason }
// Ajoute (delta > 0) ou retire (delta < 0) des crédits au solde d'un joueur.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const delta = Number(body.delta);
  const reason = String(body.reason ?? "").trim();

  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  const supabase = createAdminSupabase();

  const { data: newBalance, error } = await supabase.rpc("increment_user_balance", {
    user_uuid: params.id,
    delta,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (newBalance == null) {
    return NextResponse.json({ error: "Joueur introuvable" }, { status: 404 });
  }

  await supabase.from("transactions").insert({
    user_id: params.id,
    type: "admin_adjustment",
    amount: delta,
    description: reason || (delta > 0 ? "Crédit ajouté par l'admin" : "Crédit retiré par l'admin"),
  });

  return NextResponse.json({ ok: true, newBalance: Number(newBalance) });
}
