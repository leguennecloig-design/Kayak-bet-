// Logique de validation d'un coupon (sélections + mise) partagée entre la
// création (POST /api/user/bets) et la modification (PATCH /api/user/bets/[id])
// d'un pari — pour éviter que les deux routes divergent sur des règles
// financières sensibles (types de pari cumulables, plafonds par catégorie...).

import { createAdminSupabase } from "@/lib/supabase-server";
import type { BetType } from "@/lib/algo/types";
import { probExactPlace, probToCote, ALGO_PARAMS } from "@/lib/algo/bradley-terry";

type AdminSupabase = ReturnType<typeof createAdminSupabase>;

export type Selection = {
  participantId:   string;
  betType?:        BetType;   // absent = "TOP_1" (rétrocompat anciens clients)
  nom:             string;
  cote:            number;
  competitionId:   string;
  competitionNom:  string;
  categorie:       string;
  targetPlace?:          number; // EXACT_PLACE uniquement
  predictedTimeSeconds?: number; // EXACT_TIME/EXACT_TIME_SECOND uniquement
};

export const VALID_BET_TYPES: BetType[] = ["TOP_1", "TOP_3", "TOP_5", "TOP_10", "TOP_20", "EXACT_PLACE", "EXACT_TIME", "EXACT_TIME_SECOND"];
export const MIN_STAKE = 100;
export const MAX_STAKE = 1_000_000;
export const BALANCE_FLOOR = 200;
const RANK_TIERS = new Set(["TOP_1", "TOP_3", "TOP_5", "TOP_10", "TOP_20"]);
const MAX_PER_CATEGORY: Record<string, number> = { TOP_1: 1, TOP_3: 3, TOP_5: 5, TOP_10: 10 };

// Cotes lues directement dans la table (statiques par athlète). EXACT_PLACE est
// traité à part (cote DYNAMIQUE selon la place choisie).
export function coteColumn(betType: BetType, row: Record<string, unknown>): number {
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

// Place exacte ≥ 2 et temps exact (dixième/seconde) sont toujours cumulables
// avec n'importe quel autre pari sur le même athlète — jamais bloquants, ni
// bloqués par la règle "un seul pari de classement en attente par athlète".
export function isAlwaysStackable(s: Selection): boolean {
  const t = s.betType ?? "TOP_1";
  return t === "EXACT_TIME" || t === "EXACT_TIME_SECOND" || (t === "EXACT_PLACE" && s.targetPlace !== 1);
}

export function validateShape(selections: Selection[], stake: number): string | null {
  if (selections.length === 0) return "Aucune sélection";
  if (stake < MIN_STAKE) return `Mise minimum : ${MIN_STAKE} cr`;
  if (stake > MAX_STAKE) return `Mise maximum : ${MAX_STAKE.toLocaleString("fr-FR")} cr`;
  if (selections.some(s => !s.participantId || !s.cote || s.cote <= 1)) return "Sélection invalide";
  for (const s of selections) {
    if (s.betType != null && !VALID_BET_TYPES.includes(s.betType)) return "Type de pari invalide";
    if (s.betType === "EXACT_PLACE") {
      if (!Number.isInteger(s.targetPlace) || s.targetPlace! < 2 || s.targetPlace! > 50) {
        return "Place exacte invalide (doit être un entier ≥ 2)";
      }
    }
    if (s.betType === "EXACT_TIME") {
      if (typeof s.predictedTimeSeconds !== "number" || !Number.isFinite(s.predictedTimeSeconds) || s.predictedTimeSeconds <= 0 || s.predictedTimeSeconds > 36000) {
        return "Temps prédit invalide";
      }
    }
    if (s.betType === "EXACT_TIME_SECOND") {
      if (!Number.isInteger(s.predictedTimeSeconds) || s.predictedTimeSeconds! <= 0 || s.predictedTimeSeconds! > 36000) {
        return "Temps prédit (à la seconde) invalide";
      }
    }
  }
  return null;
}

// Un seul type de classement (Vainqueur/Top3/5/10/20) par athlète DANS CE
// COUPON, et Place exacte n°1 incompatible avec Vainqueur pour ce même
// athlète (redondant : "place exacte 1" équivaut déjà à "Vainqueur").
export function checkRankTierExclusivity(selections: Selection[]): string | null {
  const byParticipantTypes = new Map<string, Selection[]>();
  for (const s of selections) {
    byParticipantTypes.set(s.participantId, [...(byParticipantTypes.get(s.participantId) ?? []), s]);
  }
  for (const [, sels] of byParticipantTypes) {
    const types = sels.map(s => s.betType ?? "TOP_1");
    if (types.filter(t => RANK_TIERS.has(t)).length > 1) {
      return "Un seul type de classement (Vainqueur/Top 3/5/10/20) par athlète";
    }
    const hasTop1 = types.includes("TOP_1");
    const hasExactPlace1 = sels.some(s => (s.betType ?? "TOP_1") === "EXACT_PLACE" && s.targetPlace === 1);
    if (hasTop1 && hasExactPlace1) {
      return "Vainqueur et Place exacte n°1 sont incompatibles pour un même athlète";
    }
  }
  return null;
}

// Au plus N athlètes peuvent finir dans le Top N d'une catégorie donnée :
// rejette un coupon qui contiendrait plus de pronostics "Top N" (sur des
// athlètes différents) que de places réellement disponibles dans ce marché.
// Place exacte n°1 est l'équivalent de Vainqueur (Top 1).
export function checkMaxPerCategory(selections: Selection[]): string | null {
  const marketFor = (s: Selection): string | null => {
    const t = s.betType ?? "TOP_1";
    if (t === "TOP_1") return "TOP_1";
    if (t === "EXACT_PLACE" && s.targetPlace === 1) return "TOP_1";
    if (t === "TOP_3" || t === "TOP_5" || t === "TOP_10") return t;
    return null;
  };
  const byCategoryMarket = new Map<string, Set<string>>();
  for (const s of selections) {
    const market = marketFor(s);
    if (!market) continue;
    const key = `${s.competitionId}:${s.categorie}:${market}`;
    const set = byCategoryMarket.get(key) ?? new Set<string>();
    set.add(s.participantId);
    byCategoryMarket.set(key, set);
  }
  for (const [key, participantsSet] of byCategoryMarket) {
    const market = key.slice(key.lastIndexOf(":") + 1);
    const max = MAX_PER_CATEGORY[market];
    if (participantsSet.size > max) {
      return market === "TOP_1"
        ? "Un seul pari Vainqueur par catégorie (un seul athlète peut gagner une course)"
        : `Maximum ${max} pronostics "Top ${max}" par catégorie (seuls ${max} athlètes peuvent y finir)`;
    }
  }
  return null;
}

// Un seul pari "de classement" actif par athlète À LA FOIS DANS LE TEMPS : un
// nouveau pari Vainqueur/Top3/5/10/20 (ou place exacte n°1) est refusé sur un
// athlète qui en a déjà un en attente d'une soumission précédente. `excludeBetId`
// permet, en modification, d'ignorer le pari qu'on est justement en train
// d'éditer (sinon il se bloquerait toujours lui-même).
export async function checkPendingConflicts(
  adminSb: AdminSupabase,
  userId: string,
  selections: Selection[],
  excludeBetId?: string
): Promise<string | null> {
  let query = adminSb
    .from("bets")
    .select("id, selections")
    .eq("user_id", userId)
    .eq("status", "pending");
  if (excludeBetId) query = query.neq("id", excludeBetId);
  const { data: pendingBetsRows } = await query;

  const pendingParticipants = new Map<string, string>();
  for (const b of pendingBetsRows ?? []) {
    const sels: Selection[] = Array.isArray(b.selections) ? b.selections : [];
    for (const s of sels) {
      if (isAlwaysStackable(s)) continue;
      pendingParticipants.set(s.participantId, s.nom);
    }
  }
  for (const s of selections) {
    if (isAlwaysStackable(s)) continue;
    if (pendingParticipants.has(s.participantId)) {
      return `Tu as déjà un pari en attente sur ${pendingParticipants.get(s.participantId)} — attends qu'il soit réglé avant d'en placer un autre.`;
    }
  }
  return null;
}

// Revalidation serveur : ne jamais faire confiance à la cote envoyée par le
// client. Recharge participants + cotes et recalcule chaque cote côté serveur
// (mutation en place de `s.cote`) avant d'accepter le pari. `blockIfStarted`
// (modification uniquement) refuse toute modif une fois le jour de la
// compétition arrivé (`competitions.date`, granularité jour — pas d'heure en base).
export async function revalidateSelections(
  adminSb: AdminSupabase,
  selections: Selection[],
  opts: { blockIfStarted?: boolean } = {}
): Promise<{ error: string; status: number } | null> {
  const participantIds = [...new Set(selections.map(s => s.participantId))];
  const { data: participantsRows, error: partErr } = await adminSb
    .from("participants")
    .select("id, competition_id, code_bateau, cote")
    .in("id", participantIds);
  if (partErr) return { error: partErr.message, status: 500 };

  const participantsById = new Map((participantsRows ?? []).map(p => [p.id, p]));

  const compIds = [...new Set(selections.map(s => s.competitionId))];
  const { data: compsRows } = await adminSb
    .from("competitions")
    .select("id, status, paris_ouverts_a, date")
    .in("id", compIds);
  const compStatusById  = new Map((compsRows ?? []).map(c => [c.id, c.status]));
  const compOpensAtById = new Map((compsRows ?? []).map(c => [c.id, c.paris_ouverts_a as string | null]));
  const compDateById    = new Map((compsRows ?? []).map(c => [c.id, c.date as string | null]));

  const { data: cotesRows } = await adminSb
    .from("cotes")
    .select("competition_id, code_bateau, rang_espere, sigma, cote_top1, cote_top3, cote_top5, cote_top10, cote_top20, cote_exact_place, cote_exact_time, cote_exact_time_second")
    .in("competition_id", compIds);
  const cotesByKey = new Map(
    (cotesRows ?? []).map(c => [`${c.competition_id}:${c.code_bateau}`, c])
  );

  const todayStr = new Date().toISOString().slice(0, 10);

  for (const s of selections) {
    const participant = participantsById.get(s.participantId);
    if (!participant) {
      return { error: "Sélection invalide : les cotes ont peut-être été recalculées, réactualise la page.", status: 400 };
    }
    if (compStatusById.get(participant.competition_id) !== "published") {
      return { error: "Cette compétition n'est plus ouverte aux paris", status: 400 };
    }
    const opensAt = compOpensAtById.get(participant.competition_id);
    if (opensAt && new Date(opensAt).getTime() > Date.now()) {
      return {
        error: `Les paris ouvrent le ${new Date(opensAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`,
        status: 400,
      };
    }
    if (opts.blockIfStarted) {
      const compDate = compDateById.get(participant.competition_id);
      if (compDate && compDate <= todayStr) {
        return { error: "Cette compétition a déjà commencé, le coupon ne peut plus être modifié", status: 400 };
      }
    }

    const betType: BetType = s.betType ?? "TOP_1";
    let serverCote: number;
    if (betType === "TOP_1") {
      // Vainqueur : source de vérité = participants.cote (couvre aussi les
      // participants ajoutés manuellement, sans code_bateau/ligne cotes).
      serverCote = Number(participant.cote);
    } else {
      if (!participant.code_bateau) {
        return { error: "Cotes avancées indisponibles pour cet athlète", status: 400 };
      }
      const cotesRow = cotesByKey.get(`${participant.competition_id}:${participant.code_bateau}`);
      if (!cotesRow) {
        return { error: "Cotes indisponibles pour cette sélection", status: 400 };
      }
      if (betType === "EXACT_PLACE") {
        // Cote DYNAMIQUE : recalcul serveur à partir de la place choisie et de
        // la distribution de l'athlète (rang espéré + sigma). Jamais la valeur
        // client, jamais la colonne figée.
        const place = Number(s.targetPlace);
        const rang  = Number((cotesRow as Record<string, unknown>).rang_espere);
        const sig   = Number((cotesRow as Record<string, unknown>).sigma);
        if (!Number.isFinite(rang) || !Number.isFinite(sig) || sig <= 0) {
          return { error: "Cotes indisponibles pour cette sélection", status: 400 };
        }
        const p = probExactPlace(rang, sig, place);
        serverCote = probToCote(p, ALGO_PARAMS.COTE_MIN_EXACT, ALGO_PARAMS.COTE_MAX_EXACT_PLACE);
      } else {
        serverCote = coteColumn(betType, cotesRow as Record<string, unknown>);
      }
    }

    if (!Number.isFinite(serverCote) || serverCote <= 1) {
      return { error: "Cote invalide", status: 400 };
    }
    if (Math.abs(serverCote - s.cote) > 0.01) {
      return { error: "La cote a changé, réactualise ta sélection", status: 409 };
    }
    s.cote = serverCote; // jamais la valeur client pour le calcul financier
  }
  return null;
}
