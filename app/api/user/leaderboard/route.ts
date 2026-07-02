import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-server";

// GET /api/user/leaderboard
// Retourne le top 10 des joueurs par solde + la position de l'utilisateur connecté.
export async function GET() {
  const supabase = createServerSupabase();
  const adminSb  = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  // Top 10 par solde
  const { data: top, error } = await adminSb
    .from("users")
    .select("id, username, email, balance")
    .order("balance", { ascending: false })
    .limit(10);

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

  function displayName(row: { username?: string | null; email?: string | null }): string {
    if (row.username) return row.username;
    const e = row.email ?? "";
    const base = e.split("@")[0].replace(/[._-]+/g, " ").trim();
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  function initials(name: string): string {
    const parts = name.split(" ");
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }

  const rows = (top ?? []).map((u, i) => {
    const name = displayName(u);
    const ini  = initials(name);
    const wins = winsMap.get(u.id) ?? 0;
    return {
      rank:    i + 1,
      name,
      ini,
      wins,
      balance: Number(u.balance),
      streak:  0,
      isMe:    u.id === currentUserId,
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
      .select("id, username, email, balance")
      .eq("id", currentUserId)
      .single();

    if (myRow) {
      const name = displayName(myRow);
      rows.push({
        rank:    myRank,
        name,
        ini:     initials(name),
        wins:    winsMap.get(currentUserId) ?? 0,
        balance: Number(myRow.balance),
        streak:  0,
        isMe:    true,
      });
    }
  }

  return NextResponse.json(rows);
}
