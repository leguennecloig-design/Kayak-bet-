import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-server";
import { displayName, initials } from "@/lib/display-name";

// GET /api/user/leaderboard[?all=1]
// Par défaut : top 10 des joueurs par solde + la position de l'utilisateur
// connecté. Avec ?all=1 : classement complet (option "voir tout").
export async function GET(req: NextRequest) {
  const supabase = createServerSupabase();
  const adminSb  = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;
  const showAll = req.nextUrl.searchParams.get("all") === "1";

  let query = adminSb
    .from("users")
    .select("id, username, email, balance, avatar_url, instagram_handle")
    .order("balance", { ascending: false });
  if (!showAll) query = query.limit(10);
  const { data: top, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Statistiques victories par utilisateur
  const { data: wonBets } = await adminSb
    .from("bets")
    .select("user_id")
    .eq("status", "won");

  const winsMap = new Map<string, number>();
  for (const b of (wonBets ?? [])) {
    winsMap.set(b.user_id, (winsMap.get(b.user_id) ?? 0) + 1);
  }

  const rows = (top ?? []).map((u, i) => {
    const name = displayName(u);
    const ini  = initials(name);
    const wins = winsMap.get(u.id) ?? 0;
    return {
      id:        u.id,
      rank:      i + 1,
      name,
      ini,
      wins,
      balance:   Number(u.balance),
      avatarUrl: u.avatar_url ?? null,
      instagram: u.instagram_handle ?? null,
      streak:    0,
      isMe:      u.id === currentUserId,
    };
  });

  // Si l'utilisateur connecté n'est pas dans le top 10, ajouter sa position
  if (currentUserId && !rows.some(r => r.isMe)) {
    const { count } = await adminSb
      .from("users")
      .select("id", { count: "exact", head: true })
      .gt("balance", (await adminSb.from("users").select("balance").eq("id", currentUserId).single()).data?.balance ?? 0);

    const myRank = (count ?? 0) + 1;

    const { data: myRow } = await adminSb
      .from("users")
      .select("id, username, email, balance, avatar_url, instagram_handle")
      .eq("id", currentUserId)
      .single();

    if (myRow) {
      const name = displayName(myRow);
      rows.push({
        id:        myRow.id,
        rank:      myRank,
        name,
        ini:       initials(name),
        wins:      winsMap.get(currentUserId) ?? 0,
        balance:   Number(myRow.balance),
        avatarUrl: myRow.avatar_url ?? null,
        instagram: myRow.instagram_handle ?? null,
        streak:    0,
        isMe:      true,
      });
    }
  }

  return NextResponse.json(rows);
}
