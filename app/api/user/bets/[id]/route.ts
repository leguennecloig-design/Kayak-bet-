import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-server";
import { comboBonusFor } from "@/lib/bets/combo";
import {
  type Selection,
  BALANCE_FLOOR,
  validateShape,
  checkRankTierExclusivity,
  checkMaxPerCategory,
  checkPendingConflicts,
  revalidateSelections,
} from "@/lib/bets/validate-selections";

// PATCH /api/user/bets/[id]
// Modifie un pari EN ATTENTE (sélections + mise) tant que la compétition
// concernée n'a pas commencé. Body: { selections: Selection[], stake: number }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabase();
  const adminSb  = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { data: existing, error: existingErr } = await adminSb
    .from("bets")
    .select("id, user_id, status, stake, selections")
    .eq("id", params.id)
    .single();
  if (existingErr || !existing) return NextResponse.json({ error: "Pari introuvable" }, { status: 404 });
  if (existing.user_id !== user.id) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  if (existing.status !== "pending") {
    return NextResponse.json({ error: "Ce pari est déjà réglé, il ne peut plus être modifié" }, { status: 400 });
  }

  const body = await req.json();
  const selections: Selection[] = body.selections ?? [];
  const stake = Math.max(0, Number(body.stake) || 0);

  const shapeError = validateShape(selections, stake);
  if (shapeError) return NextResponse.json({ error: shapeError }, { status: 400 });

  const tierError = checkRankTierExclusivity(selections);
  if (tierError) return NextResponse.json({ error: tierError }, { status: 400 });

  const conflictError = await checkPendingConflicts(adminSb, user.id, selections, existing.id);
  if (conflictError) return NextResponse.json({ error: conflictError }, { status: 400 });

  const categoryError = checkMaxPerCategory(selections);
  if (categoryError) return NextResponse.json({ error: categoryError }, { status: 400 });

  // On revalide aussi les compétitions déjà présentes dans le pari d'origine
  // (même si elles ont été retirées du nouveau coupon) : impossible de se
  // désengager discrètement d'une sélection dont la compétition a commencé.
  const previousSelections: Selection[] = Array.isArray(existing.selections) ? existing.selections : [];
  const seen = new Set(selections.map(s => s.participantId));
  const combinedForStartCheck = [
    ...selections,
    ...previousSelections.filter(s => !seen.has(s.participantId)),
  ];
  const startCheckError = await revalidateSelections(adminSb, combinedForStartCheck, { blockIfStarted: true });
  if (startCheckError) return NextResponse.json({ error: startCheckError.error }, { status: startCheckError.status });

  const coteTotale = selections.reduce((t, s) => t * s.cote, 1);
  const gainPotentiel = Math.round(stake * coteTotale * comboBonusFor(selections.length) * 100) / 100;

  const uniqueComps = [...new Set(selections.map(s => s.competitionId))];
  const competitionId = uniqueComps.length === 1 ? uniqueComps[0] : null;

  // Ajustement du solde en une seule opération : delta > 0 (mise augmentée)
  // débite la différence (avec vérification du plancher) ; delta <= 0 (mise
  // réduite ou inchangée) recrédite la différence, toujours possible.
  const oldStake = Number(existing.stake);
  const delta = stake - oldStake;
  let newBalance: number | null = null;
  if (delta > 0) {
    const { data, error: debitErr } = await adminSb.rpc("decrement_balance_if_sufficient", {
      user_uuid: user.id,
      amount: delta,
      floor_balance: BALANCE_FLOOR,
    });
    if (debitErr) return NextResponse.json({ error: debitErr.message }, { status: 500 });
    if (data == null) {
      return NextResponse.json(
        { error: `Solde insuffisant pour augmenter la mise (il doit rester au moins ${BALANCE_FLOOR} cr après la mise)` },
        { status: 400 }
      );
    }
    newBalance = Number(data);
  } else if (delta < 0) {
    const { data, error: creditErr } = await adminSb.rpc("increment_user_balance", {
      user_uuid: user.id,
      delta: -delta,
    });
    if (creditErr) return NextResponse.json({ error: creditErr.message }, { status: 500 });
    newBalance = Number(data);
  } else {
    const { data: userRow } = await adminSb.from("users").select("balance").eq("id", user.id).single();
    newBalance = userRow ? Number(userRow.balance) : null;
  }

  const { error: updateErr } = await adminSb
    .from("bets")
    .update({
      competition_id: competitionId,
      selections,
      stake,
      cote_totale:    Math.round(coteTotale * 10000) / 10000,
      gain_potentiel: gainPotentiel,
    })
    .eq("id", existing.id);

  if (updateErr) {
    // Rollback de l'ajustement de solde si l'update du pari échoue.
    if (delta > 0) await adminSb.rpc("increment_user_balance", { user_uuid: user.id, delta });
    else if (delta < 0) await adminSb.rpc("decrement_balance_if_sufficient", { user_uuid: user.id, amount: -delta, floor_balance: 0 });
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  if (delta !== 0) {
    await adminSb.from("transactions").insert({
      user_id:     user.id,
      type:        delta > 0 ? "bet" : "refund",
      amount:      -delta,
      bet_id:      existing.id,
      description: `Modification du coupon · ${selections.map(s => s.nom).join(", ")}`,
    });
  }

  return NextResponse.json({
    betId: existing.id,
    newBalance,
    gainPotentiel,
  });
}
