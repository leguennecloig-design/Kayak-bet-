import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-server";
import { displayName, initials } from "@/lib/display-name";

type Selection = { competitionNom?: string; categorie?: string; nom?: string };

function pad2(n: number) { return String(n).padStart(2, "0"); }
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// GET /api/users/[id]/profile
// Profil public d'un joueur (pseudo, avatar, bio, stats, historique de paris
// récents) — accessible depuis le classement, au même titre que le
// rang/solde/victoires déjà publics via /api/user/leaderboard.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminSb = createAdminSupabase();
  const targetId = params.id;

  const { data: row } = await adminSb
    .from("users")
    .select("id, username, email, balance, avatar_url, bio")
    .eq("id", targetId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Joueur introuvable" }, { status: 404 });
  }

  const { count } = await adminSb
    .from("users")
    .select("id", { count: "exact", head: true })
    .gt("balance", row.balance);
  const rank = (count ?? 0) + 1;

  const { data: statsRows } = await adminSb
    .from("bets")
    .select("status, gain_reel")
    .eq("user_id", targetId);

  const totalBets = statsRows?.length ?? 0;
  const wins      = statsRows?.filter(b => b.status === "won").length ?? 0;
  const winRate   = totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0;

  const { data: betRows } = await adminSb
    .from("bets")
    .select("id, selections, stake, cote_totale, gain_potentiel, gain_reel, status, created_at")
    .eq("user_id", targetId)
    .order("created_at", { ascending: false })
    .limit(20);

  const bets = (betRows ?? []).map((b) => {
    const sels: Selection[] = Array.isArray(b.selections) ? b.selections : [];
    const first = sels[0];
    const event = sels.length === 1
      ? `${first?.competitionNom ?? "Compétition"} · ${first?.categorie ?? ""}`
      : `${first?.competitionNom ?? "Compétition"} × ${sels.length} sélections`;
    const athlete = sels.length === 1
      ? (first?.nom ?? "")
      : sels.map(s => s?.nom).join(" + ");

    const result =
      b.status === "won"  ? "win" :
      b.status === "lost" ? "loss" :
      "pending";

    return {
      id:            b.id,
      event,
      athlete,
      odds:          Number(b.cote_totale),
      stake:         Number(b.stake),
      result,
      date:          fmtDate(b.created_at as string),
      gainPotentiel: Number(b.gain_potentiel),
      gainReel:      b.gain_reel != null ? Number(b.gain_reel) : null,
    };
  });

  const name = displayName(row);

  return NextResponse.json({
    id:        row.id,
    username:  name,
    initials:  initials(name),
    avatarUrl: row.avatar_url ?? null,
    bio:       row.bio ?? "",
    balance:   Number(row.balance),
    rank,
    wins,
    totalBets,
    winRate,
    bets,
  });
}
