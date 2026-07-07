import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";

// POST /api/leagues/join { code } — rejoint une ligue via son code d'invitation.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const adminSb = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { code } = await req.json();
  const trimmed = String(code ?? "").trim().toUpperCase();
  if (!trimmed) return NextResponse.json({ error: "Code manquant" }, { status: 400 });

  const { data: league } = await adminSb
    .from("leagues")
    .select("id, name")
    .eq("invite_code", trimmed)
    .maybeSingle();
  if (!league) return NextResponse.json({ error: "Code invalide" }, { status: 404 });

  const { data: existing } = await adminSb
    .from("league_members")
    .select("id")
    .eq("league_id", league.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ id: league.id, name: league.name, alreadyMember: true });

  const { data: myUser } = await adminSb.from("users").select("balance").eq("id", user.id).single();

  const { error } = await adminSb.from("league_members").insert({
    league_id: league.id,
    user_id: user.id,
    season_start_balance: myUser?.balance ?? 0,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: league.id, name: league.name });
}
