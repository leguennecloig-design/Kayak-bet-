import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-server";

type Selection = {
  participantId:   string;
  nom:             string;
  cote:            number;
  competitionId:   string;
  competitionNom:  string;
  categorie:       string;
};

function pad2(n: number) { return String(n).padStart(2, "0"); }
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// GET /api/user/bets
// Retourne l'historique de paris de l'utilisateur connecté, formaté pour l'UI.
export async function GET() {
  const supabase = createServerSupabase();
  const adminSb  = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { data: bets, error } = await adminSb
    .from("bets")
    .select("id, selections, stake, cote_totale, gain_potentiel, gain_reel, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const formatted = (bets ?? []).map(b => {
    const sels: Selection[] = Array.isArray(b.selections) ? b.selections : [];
    const first = sels[0];
    const event = sels.length === 1
      ? `${first?.competitionNom ?? "Compétition"} · ${first?.categorie ?? ""}`
      : `${first?.competitionNom ?? "Compétition"} × ${sels.length} sélections`;
    const athlete = sels.length === 1
      ? (first?.nom ?? "")
      : sels.map(s => s.nom).join(" + ");

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

  return NextResponse.json(formatted);
}

// POST /api/user/bets
// Place un pari. Body: { selections: Selection[], stake: number }
export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const adminSb  = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await req.json();
  const selections: Selection[] = body.selections ?? [];
  const stake = Math.max(0, Number(body.stake) || 0);

  if (selections.length === 0) {
    return NextResponse.json({ error: "Aucune sélection" }, { status: 400 });
  }
  if (stake <= 0) {
    return NextResponse.json({ error: "Mise invalide" }, { status: 400 });
  }
  if (selections.some(s => !s.participantId || !s.cote || s.cote <= 1)) {
    return NextResponse.json({ error: "Sélection invalide" }, { status: 400 });
  }

  // Récupérer le solde actuel
  const { data: userRow } = await adminSb
    .from("users")
    .select("balance")
    .eq("id", user.id)
    .single();

  const currentBalance = Number(userRow?.balance ?? 0);
  if (currentBalance < stake) {
    return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
  }

  const coteTotale    = selections.reduce((t, s) => t * s.cote, 1);
  const gainPotentiel = Math.round(stake * coteTotale * 100) / 100;

  // competition_id = compétition du 1er sélectionné (ou null si multi-comp)
  const uniqueComps = [...new Set(selections.map(s => s.competitionId))];
  const competitionId = uniqueComps.length === 1 ? uniqueComps[0] : null;

  // Insérer le pari
  const { data: bet, error: betErr } = await adminSb
    .from("bets")
    .insert({
      user_id:        user.id,
      competition_id: competitionId,
      selections,
      stake,
      cote_totale:    Math.round(coteTotale * 10000) / 10000,
      gain_potentiel: gainPotentiel,
      status:         "pending",
    })
    .select("id")
    .single();

  if (betErr || !bet) {
    return NextResponse.json({ error: betErr?.message ?? "Erreur insertion" }, { status: 500 });
  }

  // Débiter le solde atomiquement
  const { data: newBal } = await adminSb.rpc("increment_user_balance", {
    user_uuid: user.id,
    delta: -stake,
  });

  // Créer la transaction de mise
  await adminSb.from("transactions").insert({
    user_id:     user.id,
    type:        "bet",
    amount:      -stake,
    bet_id:      bet.id,
    description: `Mise · ${selections.map(s => s.nom).join(", ")}`,
  });

  return NextResponse.json({
    betId:         bet.id,
    newBalance:    Number(newBal ?? (currentBalance - stake)),
    gainPotentiel,
  });
}
