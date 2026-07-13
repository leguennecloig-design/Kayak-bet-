import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-server";
import { displayName, initials } from "@/lib/display-name";

type BoardType = "points" | "winrate" | "estimated" | "wongains";
const VALID_TYPES: BoardType[] = ["points", "winrate", "estimated", "wongains"];

// GET /api/user/leaderboard[?all=1][&type=points|winrate|estimated|wongains]
// Par défaut : classement "points" (solde), top 10 + position du joueur
// connecté. Avec ?all=1 : classement complet. ?type= choisit le classement :
//   points    — solde actuel (comme avant)
//   winrate   — % de paris gagnés (parmi les joueurs ayant misé au moins 1 fois)
//   estimated — gain potentiel total sur les paris EN COURS (pending)
//   wongains  — gains réels cumulés sur les paris GAGNÉS
export async function GET(req: NextRequest) {
  const supabase = createServerSupabase();
  const adminSb  = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;
  const showAll = req.nextUrl.searchParams.get("all") === "1";
  const typeParam = req.nextUrl.searchParams.get("type");
  const type: BoardType = VALID_TYPES.includes(typeParam as BoardType) ? (typeParam as BoardType) : "points";

  const { data: users, error } = await adminSb
    .from("users")
    .select("id, username, email, balance, avatar_url, instagram_handle");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: bets } = await adminSb
    .from("bets")
    .select("user_id, status, gain_reel, gain_potentiel");

  const winsMap      = new Map<string, number>();
  const totalMap      = new Map<string, number>();
  const estimatedMap  = new Map<string, number>();
  const wonGainsMap   = new Map<string, number>();
  for (const b of (bets ?? [])) {
    totalMap.set(b.user_id, (totalMap.get(b.user_id) ?? 0) + 1);
    if (b.status === "won") {
      winsMap.set(b.user_id, (winsMap.get(b.user_id) ?? 0) + 1);
      wonGainsMap.set(b.user_id, (wonGainsMap.get(b.user_id) ?? 0) + Number(b.gain_reel ?? 0));
    }
    if (b.status === "pending") {
      estimatedMap.set(b.user_id, (estimatedMap.get(b.user_id) ?? 0) + Number(b.gain_potentiel ?? 0));
    }
  }

  type Row = {
    id: string; name: string; ini: string; balance: number;
    avatarUrl: string | null; instagram: string | null;
    wins: number; totalBets: number; winRate: number;
    estimatedGain: number; wonGains: number; isMe: boolean;
  };

  let rows: Row[] = (users ?? []).map((u) => {
    const name  = displayName(u);
    const total = totalMap.get(u.id) ?? 0;
    const wins  = winsMap.get(u.id) ?? 0;
    return {
      id:        u.id,
      name,
      ini:       initials(name),
      balance:   Number(u.balance),
      avatarUrl: u.avatar_url ?? null,
      instagram: u.instagram_handle ?? null,
      wins,
      totalBets:     total,
      winRate:       total > 0 ? wins / total : 0,
      estimatedGain: estimatedMap.get(u.id) ?? 0,
      wonGains:      wonGainsMap.get(u.id) ?? 0,
      isMe:          u.id === currentUserId,
    };
  });

  // Classements winrate/estimé/gains : seuls les joueurs avec l'activité
  // correspondante ont leur mot à dire (sinon tout le monde à 0 en vrac).
  if (type === "winrate")   rows = rows.filter(r => r.totalBets > 0);
  if (type === "estimated") rows = rows.filter(r => r.estimatedGain > 0);
  if (type === "wongains")  rows = rows.filter(r => r.wonGains > 0);

  const sortValue: Record<BoardType, (r: Row) => number> = {
    points:    (r) => r.balance,
    winrate:   (r) => r.winRate,
    estimated: (r) => r.estimatedGain,
    wongains:  (r) => r.wonGains,
  };
  rows.sort((a, b) => sortValue[type](b) - sortValue[type](a) || b.totalBets - a.totalBets);

  const ranked = rows.map((r, i) => ({
    id:        r.id,
    rank:      i + 1,
    name:      r.name,
    ini:       r.ini,
    wins:      r.wins,
    balance:   r.balance,
    avatarUrl: r.avatarUrl,
    instagram: r.instagram,
    streak:    0,
    isMe:      r.isMe,
    totalBets: r.totalBets,
    winRate:   Math.round(r.winRate * 100),
    estimatedGain: Math.round(r.estimatedGain),
    wonGains:      Math.round(r.wonGains),
  }));

  if (showAll) return NextResponse.json(ranked);

  const top10 = ranked.slice(0, 10);
  if (currentUserId && !top10.some(r => r.isMe)) {
    const mine = ranked.find(r => r.isMe);
    if (mine) top10.push(mine);
  }
  return NextResponse.json(top10);
}
