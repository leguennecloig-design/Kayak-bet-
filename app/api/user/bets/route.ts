import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-server";
import { comboBonusFor } from "@/lib/bets/combo";
import { notifyUser } from "@/lib/notifications/create";
import {
  type Selection,
  MIN_STAKE,
  BALANCE_FLOOR,
  validateShape,
  checkRankTierExclusivity,
  checkMaxPerCategory,
  checkPendingConflicts,
  revalidateSelections,
} from "@/lib/bets/validate-selections";

const COMPETITION_REFERRAL_BONUS = 200;

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
    .select("id, selections, stake, cote_totale, gain_potentiel, gain_reel, status, created_at, settled_at")
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
      b.status === "won"       ? "win" :
      b.status === "lost"      ? "loss" :
      b.status === "cancelled" ? "cancelled" :
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
      selections:    sels,
      settledAt:     b.settled_at as string | null,
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

  const shapeError = validateShape(selections, stake);
  if (shapeError) return NextResponse.json({ error: shapeError }, { status: 400 });

  const tierError = checkRankTierExclusivity(selections);
  if (tierError) return NextResponse.json({ error: tierError }, { status: 400 });

  const conflictError = await checkPendingConflicts(adminSb, user.id, selections);
  if (conflictError) return NextResponse.json({ error: conflictError }, { status: 400 });

  const categoryError = checkMaxPerCategory(selections);
  if (categoryError) return NextResponse.json({ error: categoryError }, { status: 400 });

  const revalidationError = await revalidateSelections(adminSb, selections);
  if (revalidationError) return NextResponse.json({ error: revalidationError.error }, { status: revalidationError.status });

  const coteTotale = selections.reduce((t, s) => t * s.cote, 1);
  // Pari combiné (2+ sélections) : bonus croissant plafonné (voir lib/bets/combo.ts),
  // en plus des cotes cumulées — incitation mesurée à combiner plusieurs pronostics.
  const gainPotentiel = Math.round(stake * coteTotale * comboBonusFor(selections.length) * 100) / 100;

  // competition_id = compétition du 1er sélectionné (ou null si multi-comp)
  const uniqueComps = [...new Set(selections.map(s => s.competitionId))];
  const competitionId = uniqueComps.length === 1 ? uniqueComps[0] : null;

  // Débiter le solde de façon atomique ET conditionnelle (WHERE balance >=
  // stake dans le même UPDATE, voir migration 20260714) — élimine la course
  // entre deux requêtes concurrentes qui, avec un SELECT solde puis un débit
  // séparé, pouvaient toutes les deux lire le même solde suffisant avant
  // qu'aucune n'écrive, et donc placer plusieurs paris pour un solde qui
  // n'aurait dû en couvrir qu'un (voire faire passer le solde en négatif).
  const { data: newBalanceRaw, error: debitErr } = await adminSb.rpc("decrement_balance_if_sufficient", {
    user_uuid: user.id,
    amount: stake,
    floor_balance: BALANCE_FLOOR,
  });
  if (debitErr) return NextResponse.json({ error: debitErr.message }, { status: 500 });
  if (newBalanceRaw == null) {
    return NextResponse.json(
      { error: `Solde insuffisant (il doit rester au moins ${BALANCE_FLOOR} cr après la mise)` },
      { status: 400 }
    );
  }
  let finalBalance = Number(newBalanceRaw);

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
    // Le pari n'a finalement pas été créé : rembourse le débit déjà effectué.
    await adminSb.rpc("increment_user_balance", { user_uuid: user.id, delta: stake });
    return NextResponse.json({ error: betErr?.message ?? "Erreur insertion" }, { status: 500 });
  }

  // Créer la transaction de mise
  await adminSb.from("transactions").insert({
    user_id:     user.id,
    type:        "bet",
    amount:      -stake,
    bet_id:      bet.id,
    description: `Mise · ${selections.map(s => s.nom).join(", ")}`,
  });

  // Bonus de parrainage lié à une compétition (lien /c/[id]?ref=CODE, voir
  // POST /api/referral/apply) : versé au parrain ET au filleul dès que ce
  // dernier place son PREMIER pari sur LA compétition visée par le lien —
  // jamais à l'inscription elle-même. Un seul bonus par pari, même si le
  // coupon référence plusieurs compétitions avec invitations en attente.
  let referralBonusApplied = 0;
  for (const compId of uniqueComps) {
    const { data: pendingRef } = await adminSb
      .from("competition_referrals")
      .select("id, referrer_id")
      .eq("referred_id", user.id)
      .eq("competition_id", compId)
      .is("rewarded_at", null)
      .maybeSingle();
    if (!pendingRef) continue;

    const { count: priorBetsCount } = await adminSb
      .from("bets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("id", bet.id)
      .contains("selections", JSON.stringify([{ competitionId: compId }]));
    if (priorBetsCount && priorBetsCount > 0) continue;

    // Marque "récompensé" de façon atomique (WHERE rewarded_at IS NULL) pour
    // éviter un double crédit si deux requêtes concurrentes matchaient toutes
    // les deux la même invitation en attente.
    const { data: claimed } = await adminSb
      .from("competition_referrals")
      .update({ rewarded_at: new Date().toISOString() })
      .eq("id", pendingRef.id)
      .is("rewarded_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    await adminSb.rpc("increment_user_balance", { user_uuid: pendingRef.referrer_id, delta: COMPETITION_REFERRAL_BONUS });
    const { data: balAfterBonus } = await adminSb.rpc("increment_user_balance", {
      user_uuid: user.id,
      delta: COMPETITION_REFERRAL_BONUS,
    });
    if (balAfterBonus != null) finalBalance = Number(balAfterBonus);

    await adminSb.from("transactions").insert([
      {
        user_id:     pendingRef.referrer_id,
        type:        "referral_bonus",
        amount:      COMPETITION_REFERRAL_BONUS,
        description: "Parrainage compétition — ton filleul a placé son premier pari grâce à toi",
      },
      {
        user_id:     user.id,
        type:        "referral_bonus",
        amount:      COMPETITION_REFERRAL_BONUS,
        bet_id:      bet.id,
        description: "Parrainage compétition — bonus pour ton premier pari sur cette compétition",
      },
    ]);

    await notifyUser(adminSb, pendingRef.referrer_id, {
      type: "referral_used",
      title: "Ton filleul a parié ! 🎉",
      body: `Il/elle vient de placer son premier pari sur la compétition à laquelle tu l'as invité. +${COMPETITION_REFERRAL_BONUS} crédits pour toi !`,
      url: "/app",
      actorId: user.id,
    });

    referralBonusApplied = COMPETITION_REFERRAL_BONUS;
    break;
  }

  return NextResponse.json({
    betId:         bet.id,
    newBalance:    finalBalance,
    gainPotentiel,
    referralBonusApplied,
  });
}
