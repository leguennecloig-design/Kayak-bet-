import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";
import { displayName, initials } from "@/lib/display-name";

// GET /api/leagues/[id] — détails d'une ligue + classement de ses membres.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase();
  const adminSb = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { data: league } = await adminSb
    .from("leagues")
    .select("id, name, invite_code, creator_id, current_season")
    .eq("id", params.id)
    .maybeSingle();
  if (!league) return NextResponse.json({ error: "Ligue introuvable" }, { status: 404 });

  const { data: myMembership } = await adminSb
    .from("league_members")
    .select("id")
    .eq("league_id", league.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!myMembership) return NextResponse.json({ error: "Tu n'es pas membre de cette ligue" }, { status: 403 });

  const { data: members } = await adminSb
    .from("league_members")
    .select("user_id, season_start_balance, users(username, email, avatar_url, balance)")
    .eq("league_id", league.id);

  const ranked = (members ?? [])
    .map((m) => {
      const u = m.users as unknown as { username: string | null; email: string | null; avatar_url: string | null; balance: number } | null;
      const name = displayName({ username: u?.username, email: u?.email });
      const balance = Number(u?.balance ?? 0);
      return {
        userId: m.user_id,
        username: name,
        initials: initials(name),
        avatarUrl: u?.avatar_url ?? null,
        gain: balance - Number(m.season_start_balance),
      };
    })
    .sort((a, b) => b.gain - a.gain)
    .map((m, i) => ({ ...m, rank: i + 1 }));

  return NextResponse.json({
    id: league.id,
    name: league.name,
    inviteCode: league.invite_code,
    currentSeason: league.current_season,
    isCreator: league.creator_id === user.id,
    members: ranked,
  });
}

// DELETE /api/leagues/[id] — supprime la ligue (créateur uniquement).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase();
  const adminSb = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { data: league } = await adminSb
    .from("leagues")
    .select("id, creator_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!league) return NextResponse.json({ error: "Ligue introuvable" }, { status: 404 });
  if (league.creator_id !== user.id) {
    return NextResponse.json({ error: "Seul le créateur peut supprimer la ligue" }, { status: 403 });
  }

  const { error } = await adminSb.from("leagues").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
