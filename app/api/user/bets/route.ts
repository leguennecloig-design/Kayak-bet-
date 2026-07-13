import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminSupabase } from "@/lib/supabase-server";
import type { BetType } from "@/lib/algo/types";
import { probExactPlace, probToCote, ALGO_PARAMS } from "@/lib/algo/bradley-terry";

type Selection = {
  participantId:   string;
  betType?:        BetType;   // absent = "TOP_1" (rétrocompat anciens clients)
  nom:             string;
  cote:            number;
  competitionId:   string;
  competitionNom:  string;
  categorie:       string;
  targetPlace?:          number; // EXACT_PLACE uniquement
  predictedTimeSeconds?: number; // EXACT_TIME uniquement
};

const VALID_BET_TYPES: BetType[] = ["TOP_1", "TOP_3", "TOP_5", "TOP_10", "TOP_20", "EXACT_PLACE", "EXACT_TIME", "EXACT_TIME_SECOND"];
const RANK_TIERS: Set<BetType> = new Set(["TOP_1", "TOP_3", "TOP_5", "TOP_10", "TOP_20"]);
const MIN_STAKE = 30;
const MAX_STAKE_PER_ATHLETE = 200;
const BALANCE_FLOOR = 200;

// Cotes lues directement dans la table (statiques par athlète). EXACT_PLACE est
// traité à part (cote DYNAMIQUE selon la place choisie — voir plus bas).
function coteColumn(betType: BetType, row: Record<string, unknown>): number {
  switch (betType) {
    case "TOP_1":              return Number(row.cote_top1);
    case "TOP_3":              return Number(row.cote_top3);
    case "TOP_5":              return Number(row.cote_top5);
    case "TOP_10":             return Number(row.cote_top10);
    case "TOP_20":             return Number(row.cote_top20);
    case "EXACT_PLACE":        return Number(row.cote_exact_place); // repli, normalement dynamique
    case "EXACT_TIME":         return Number(row.cote_exact_time);
    case "EXACT_TIME_SECOND":  return Number(row.cote_exact_time_second);
  }
}

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
  if (stake < MIN_STAKE) {
    return NextResponse.json({ error: `Mise minimum : ${MIN_STAKE} cr` }, { status: 400 });
  }
  if (selections.some(s => !s.participantId || !s.cote || s.cote <= 1)) {
    return NextResponse.json({ error: "Sélection invalide" }, { status: 400 });
  }
  for (const s of selections) {
    if (s.betType != null && !VALID_BET_TYPES.includes(s.betType)) {
      return NextResponse.json({ error: "Type de pari invalide" }, { status: 400 });
    }
    if (s.betType === "EXACT_PLACE") {
      if (!Number.isInteger(s.targetPlace) || s.targetPlace! < 2 || s.targetPlace! > 50) {
        return NextResponse.json({ error: "Place exacte invalide (doit être un entier ≥ 2)" }, { status: 400 });
      }
    }
    if (s.betType === "EXACT_TIME") {
      if (typeof s.predictedTimeSeconds !== "number" || !Number.isFinite(s.predictedTimeSeconds) || s.predictedTimeSeconds <= 0 || s.predictedTimeSeconds > 36000) {
        return NextResponse.json({ error: "Temps prédit invalide" }, { status: 400 });
      }
    }
    if (s.betType === "EXACT_TIME_SECOND") {
      // Temps à la seconde : entier de secondes
      if (!Number.isInteger(s.predictedTimeSeconds) || s.predictedTimeSeconds! <= 0 || s.predictedTimeSeconds! > 36000) {
        return NextResponse.json({ error: "Temps prédit (à la seconde) invalide" }, { status: 400 });
      }
    }
  }

  // Un seul pari "classement" (Vainqueur/Top3/5/10/20) par athlète, et Place
  // exacte n°1 incompatible avec Vainqueur pour ce même athlète (redondant :
  // déjà appliqué côté client dans toggle(), revalidé ici car le client
  // n'est pas fiable — place exacte ≥ 2 peut en revanche coexister avec un
  // pari Vainqueur, ce sont deux paris différents).
  const byParticipant = new Map<string, Selection[]>();
  for (const s of selections) {
    byParticipant.set(s.participantId, [...(byParticipant.get(s.participantId) ?? []), s]);
  }
  for (const [, sels] of byParticipant) {
    const types = sels.map(s => s.betType ?? "TOP_1");
    const rankTiersUsed = types.filter(t => RANK_TIERS.has(t));
    if (rankTiersUsed.length > 1) {
      return NextResponse.json(
        { error: "Un seul type de classement (Vainqueur/Top 3/5/10/20) par athlète" },
        { status: 400 }
      );
    }
    const hasTop1 = types.includes("TOP_1");
    const hasExactPlace1 = sels.some(s => (s.betType ?? "TOP_1") === "EXACT_PLACE" && s.targetPlace === 1);
    if (hasTop1 && hasExactPlace1) {
      return NextResponse.json(
        { error: "Vainqueur et Place exacte n°1 sont incompatibles pour un même athlète" },
        { status: 400 }
      );
    }
  }

  // Un seul athlète peut gagner une catégorie donnée : rejette un même coupon
  // qui contiendrait deux paris "vainqueur" (Top1 ou place exacte n°1,
  // équivalent) sur deux athlètes différents de la même catégorie — déjà
  // empêché côté client dans toggle(), revalidé ici.
  const isWinnerSelection = (s: Selection) =>
    (s.betType ?? "TOP_1") === "TOP_1" || ((s.betType ?? "TOP_1") === "EXACT_PLACE" && s.targetPlace === 1);
  const winnersByCategory = new Map<string, Set<string>>();
  for (const s of selections) {
    if (!isWinnerSelection(s)) continue;
    const key = `${s.competitionId}:${s.categorie}`;
    const set = winnersByCategory.get(key) ?? new Set<string>();
    set.add(s.participantId);
    winnersByCategory.set(key, set);
  }
  for (const participantsSet of winnersByCategory.values()) {
    if (participantsSet.size > 1) {
      return NextResponse.json(
        { error: "Un seul pari Vainqueur par catégorie (un seul athlète peut gagner une course)" },
        { status: 400 }
      );
    }
  }

  // Plafond cumulé de 200 cr de mise par athlète, tous paris en attente
  // confondus (pas seulement celui-ci) — la mise entière d'un pari combiné
  // compte pour chaque athlète qu'il référence.
  const uniqueParticipantIds = [...new Set(selections.map(s => s.participantId))];
  const { data: pendingBetsRows } = await adminSb
    .from("bets")
    .select("stake, selections")
    .eq("user_id", user.id)
    .eq("status", "pending");

  const existingStakeByParticipant = new Map<string, number>();
  for (const b of pendingBetsRows ?? []) {
    const sels: Selection[] = Array.isArray(b.selections) ? b.selections : [];
    const participantsInBet = new Set(sels.map(s => s.participantId));
    for (const pid of participantsInBet) {
      existingStakeByParticipant.set(pid, (existingStakeByParticipant.get(pid) ?? 0) + Number(b.stake));
    }
  }
  for (const pid of uniqueParticipantIds) {
    const already = existingStakeByParticipant.get(pid) ?? 0;
    if (already + stake > MAX_STAKE_PER_ATHLETE) {
      const nom = selections.find(s => s.participantId === pid)?.nom ?? "cet athlète";
      return NextResponse.json(
        { error: `${MAX_STAKE_PER_ATHLETE} cr maximum par athlète (déjà ${already} cr en attente sur ${nom})` },
        { status: 400 }
      );
    }
  }

  // Revalidation serveur : ne jamais faire confiance à la cote envoyée par le
  // client. On recharge participants + cotes et on recalcule chaque cote
  // côté serveur avant d'accepter le pari.
  const participantIds = [...new Set(selections.map(s => s.participantId))];
  const { data: participantsRows, error: partErr } = await adminSb
    .from("participants")
    .select("id, competition_id, code_bateau, cote")
    .in("id", participantIds);
  if (partErr) return NextResponse.json({ error: partErr.message }, { status: 500 });

  const participantsById = new Map((participantsRows ?? []).map(p => [p.id, p]));

  const compIds = [...new Set(selections.map(s => s.competitionId))];
  const { data: compsRows } = await adminSb
    .from("competitions")
    .select("id, status, paris_ouverts_a")
    .in("id", compIds);
  const compStatusById = new Map((compsRows ?? []).map(c => [c.id, c.status]));
  const compOpensAtById = new Map((compsRows ?? []).map(c => [c.id, c.paris_ouverts_a as string | null]));

  const { data: cotesRows } = await adminSb
    .from("cotes")
    .select("competition_id, code_bateau, rang_espere, sigma, cote_top1, cote_top3, cote_top5, cote_top10, cote_top20, cote_exact_place, cote_exact_time, cote_exact_time_second")
    .in("competition_id", compIds);
  const cotesByKey = new Map(
    (cotesRows ?? []).map(c => [`${c.competition_id}:${c.code_bateau}`, c])
  );

  for (const s of selections) {
    const participant = participantsById.get(s.participantId);
    if (!participant) {
      return NextResponse.json(
        { error: "Sélection invalide : les cotes ont peut-être été recalculées, réactualise la page." },
        { status: 400 }
      );
    }
    if (compStatusById.get(participant.competition_id) !== "published") {
      return NextResponse.json({ error: "Cette compétition n'est plus ouverte aux paris" }, { status: 400 });
    }
    const opensAt = compOpensAtById.get(participant.competition_id);
    if (opensAt && new Date(opensAt).getTime() > Date.now()) {
      return NextResponse.json(
        { error: `Les paris ouvrent le ${new Date(opensAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}` },
        { status: 400 }
      );
    }

    const betType: BetType = s.betType ?? "TOP_1";
    let serverCote: number;
    if (betType === "TOP_1") {
      // Vainqueur : source de vérité = participants.cote (couvre aussi les
      // participants ajoutés manuellement, sans code_bateau/ligne cotes).
      serverCote = Number(participant.cote);
    } else {
      if (!participant.code_bateau) {
        return NextResponse.json({ error: "Cotes avancées indisponibles pour cet athlète" }, { status: 400 });
      }
      const cotesRow = cotesByKey.get(`${participant.competition_id}:${participant.code_bateau}`);
      if (!cotesRow) {
        return NextResponse.json({ error: "Cotes indisponibles pour cette sélection" }, { status: 400 });
      }
      if (betType === "EXACT_PLACE") {
        // Cote DYNAMIQUE : recalcul serveur à partir de la place choisie et de
        // la distribution de l'athlète (rang espéré + sigma). Jamais la valeur
        // client, jamais la colonne figée.
        const place = Number(s.targetPlace);
        const rang  = Number((cotesRow as Record<string, unknown>).rang_espere);
        const sig   = Number((cotesRow as Record<string, unknown>).sigma);
        if (!Number.isFinite(rang) || !Number.isFinite(sig) || sig <= 0) {
          return NextResponse.json({ error: "Cotes indisponibles pour cette sélection" }, { status: 400 });
        }
        const p = probExactPlace(rang, sig, place);
        serverCote = probToCote(p, ALGO_PARAMS.COTE_MIN_EXACT, ALGO_PARAMS.COTE_MAX_EXACT_PLACE);
      } else {
        serverCote = coteColumn(betType, cotesRow);
      }
    }

    if (!Number.isFinite(serverCote) || serverCote <= 1) {
      return NextResponse.json({ error: "Cote invalide" }, { status: 400 });
    }
    if (Math.abs(serverCote - s.cote) > 0.01) {
      return NextResponse.json({ error: "La cote a changé, réactualise ta sélection" }, { status: 409 });
    }
    s.cote = serverCote; // jamais la valeur client pour le calcul financier
  }

  const coteTotale    = selections.reduce((t, s) => t * s.cote, 1);
  const gainPotentiel = Math.round(stake * coteTotale * 100) / 100;

  // competition_id = compétition du 1er sélectionné (ou null si multi-comp)
  const uniqueComps = [...new Set(selections.map(s => s.competitionId))];
  const competitionId = uniqueComps.length === 1 ? uniqueComps[0] : null;

  // Débiter le solde de façon atomique ET conditionnelle (WHERE balance >=
  // stake dans le même UPDATE, voir migration 20260714) — élimine la course
  // entre deux requêtes concurrentes qui, avec un SELECT solde puis un débit
  // séparé, pouvaient toutes les deux lire le même solde suffisant avant
  // qu'aucune n'écrive, et donc placer plusieurs paris pour un solde qui
  // n'aurait dû en couvrir qu'un (voire faire passer le solde en négatif).
  const { data: newBalance, error: debitErr } = await adminSb.rpc("decrement_balance_if_sufficient", {
    user_uuid: user.id,
    amount: stake,
    floor_balance: BALANCE_FLOOR,
  });
  if (debitErr) return NextResponse.json({ error: debitErr.message }, { status: 500 });
  if (newBalance == null) {
    return NextResponse.json(
      { error: `Solde insuffisant (il doit rester au moins ${BALANCE_FLOOR} cr après la mise)` },
      { status: 400 }
    );
  }

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

  return NextResponse.json({
    betId:         bet.id,
    newBalance:    Number(newBalance),
    gainPotentiel,
  });
}
