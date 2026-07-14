import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";
import { registerCompetitionReferral } from "@/lib/referral/competition-referral";

// POST /api/competitions/[id]/referral { code }
// Saisie manuelle, depuis l'écran d'une compétition, du code d'un ami qui
// t'y a invité (alternative au lien /c/[id]?ref=CODE cliqué avant inscription).
// N'accorde aucun bonus ici — seul le premier pari du filleul sur CETTE
// compétition le déclenche (voir POST /api/user/bets). Ne touche jamais au
// parrainage général (bonus de bienvenue à l'inscription).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabase();
  const adminSb  = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { data: comp } = await adminSb
    .from("competitions")
    .select("id")
    .eq("id", params.id)
    .eq("status", "published")
    .maybeSingle();
  if (!comp) return NextResponse.json({ error: "Compétition introuvable" }, { status: 404 });

  const { code } = await req.json().catch(() => ({}));
  const result = await registerCompetitionReferral(adminSb, String(code ?? ""), user.id, params.id);

  if (!result.ok) {
    const message =
      result.reason === "self_referral" ? "Tu ne peux pas utiliser ton propre code" : "Code invalide";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
