import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";

function makeInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans O/0/I/1, moins d'ambiguïté
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// GET /api/leagues — liste les ligues dont je suis membre, avec mon rang/gain.
export async function GET() {
  const supabase = createServerSupabase();
  const adminSb = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { data: myMemberships } = await adminSb
    .from("league_members")
    .select("league_id, season_start_balance")
    .eq("user_id", user.id);

  const leagueIds = (myMemberships ?? []).map(m => m.league_id);
  if (leagueIds.length === 0) return NextResponse.json({ leagues: [] });

  const { data: leagueRows } = await adminSb
    .from("leagues")
    .select("id, name, invite_code, creator_id, current_season")
    .in("id", leagueIds);

  const leagues = [];
  for (const league of leagueRows ?? []) {
    const { data: members } = await adminSb
      .from("league_members")
      .select("user_id, season_start_balance, users(balance)")
      .eq("league_id", league.id);

    const ranked = (members ?? [])
      .map((m) => {
        const balance = Number((m.users as unknown as { balance: number } | null)?.balance ?? 0);
        return { userId: m.user_id, gain: balance - Number(m.season_start_balance) };
      })
      .sort((a, b) => b.gain - a.gain);

    const myRank = ranked.findIndex(r => r.userId === user.id) + 1;
    const myGain = ranked.find(r => r.userId === user.id)?.gain ?? 0;

    leagues.push({
      id: league.id,
      name: league.name,
      inviteCode: league.invite_code,
      currentSeason: league.current_season,
      isCreator: league.creator_id === user.id,
      memberCount: ranked.length,
      myRank,
      myGain,
    });
  }

  return NextResponse.json({ leagues });
}

// POST /api/leagues { name } — crée une nouvelle ligue, moi comme créateur.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const adminSb = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { name } = await req.json();
  const trimmed = String(name ?? "").trim().slice(0, 60);
  if (trimmed.length < 3) {
    return NextResponse.json({ error: "Le nom doit faire au moins 3 caractères" }, { status: 400 });
  }

  const { data: myUser } = await adminSb.from("users").select("balance").eq("id", user.id).single();

  let inviteCode = makeInviteCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await adminSb.from("leagues").select("id").eq("invite_code", inviteCode).maybeSingle();
    if (!existing) break;
    inviteCode = makeInviteCode();
  }

  const { data: league, error } = await adminSb
    .from("leagues")
    .insert({ name: trimmed, invite_code: inviteCode, creator_id: user.id })
    .select("id")
    .single();
  if (error || !league) return NextResponse.json({ error: error?.message ?? "Erreur création" }, { status: 500 });

  await adminSb.from("league_members").insert({
    league_id: league.id,
    user_id: user.id,
    season_start_balance: myUser?.balance ?? 0,
  });

  return NextResponse.json({ id: league.id, inviteCode });
}
