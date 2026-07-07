import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";

// POST /api/leagues/[id]/new-season — le créateur remet les compteurs à zéro
// (chaque membre repart de son solde actuel) et incrémente le numéro de saison.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase();
  const adminSb = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { data: league } = await adminSb
    .from("leagues")
    .select("id, creator_id, current_season")
    .eq("id", params.id)
    .maybeSingle();
  if (!league) return NextResponse.json({ error: "Ligue introuvable" }, { status: 404 });
  if (league.creator_id !== user.id) {
    return NextResponse.json({ error: "Seul le créateur peut démarrer une nouvelle saison" }, { status: 403 });
  }

  const { data: members } = await adminSb
    .from("league_members")
    .select("user_id, users(balance)")
    .eq("league_id", params.id);

  for (const m of members ?? []) {
    const balance = Number((m.users as unknown as { balance: number } | null)?.balance ?? 0);
    await adminSb
      .from("league_members")
      .update({ season_start_balance: balance })
      .eq("league_id", params.id)
      .eq("user_id", m.user_id);
  }

  const { error } = await adminSb
    .from("leagues")
    .update({ current_season: league.current_season + 1 })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, currentSeason: league.current_season + 1 });
}
