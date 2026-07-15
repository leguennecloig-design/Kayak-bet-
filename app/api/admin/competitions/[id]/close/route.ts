import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { notifyUser } from "@/lib/notifications/create";
import { parseTempsToSeconds } from "@/lib/utils/time";
import { comboBonusFor } from "@/lib/bets/combo";
import type { BetType } from "@/lib/algo/types";

// Clôturer une compétition avec beaucoup de paris en attente peut dépasser
// la durée par défaut d'une fonction serverless (chaque pari fait plusieurs
// allers-retours DB séquentiels) — le client reçoit alors un 504 alors que
// le traitement continue côté serveur jusqu'au bout (d'où des crédits déjà
// reçus malgré l'erreur affichée). Ce réglage augmente la limite sur les
// plateformes qui le respectent (Vercel Pro+) ; le vrai fix est le
// traitement en parallèle des paris plus bas (settleAllBets).
export const maxDuration = 300;

type Selection = {
  participantId:  string;
  nom:            string;
  cote:           number;
  competitionId:  string;
  competitionNom: string;
  categorie:      string;
  betType?:              BetType;
  targetPlace?:          number;
  predictedTimeSeconds?: number;
};

type ResultEntry = {
  rang: number | null;
  tempsSeconds: number | null;
  dns: boolean; // Absent — void, ne pénalise pas
  dnf: boolean; // Abandon — perte sèche
  dsq: boolean; // Disqualifié — perte sèche
};

// Détermine l'issue d'une sélection selon sa vraie règle de pari. "void" =
// neutre : ne fait ni gagner ni perdre, et compte comme une cote de 1 (donc
// ne casse pas un pari combiné) — cas d'un athlète absent des résultats
// importés (catégorie/nom introuvable) OU explicitement marqué Abs (DNS).
// Dsq et Abd (DNF) sont en revanche une perte sèche, quel que soit le type
// de pari : aucun classement valide à faire valoir sur cet athlète.
function selectionOutcome(
  sel: Selection,
  catMap: Map<string, ResultEntry> | undefined
): "won" | "lost" | "void" {
  if (!catMap) return "void";
  const entry = catMap.get(normalize(sel.nom));
  if (!entry) return "void";

  if (entry.dsq || entry.dnf) return "lost";
  if (entry.dns) return "void";
  if (entry.rang == null) return "void"; // filet de sécurité (ligne sans rang ni statut)

  const betType: BetType = sel.betType ?? "TOP_1";
  switch (betType) {
    case "TOP_1":  return entry.rang === 1  ? "won" : "lost";
    case "TOP_3":  return entry.rang <= 3   ? "won" : "lost";
    case "TOP_5":  return entry.rang <= 5   ? "won" : "lost";
    case "TOP_10": return entry.rang <= 10  ? "won" : "lost";
    case "TOP_20": return entry.rang <= 20  ? "won" : "lost";
    case "EXACT_PLACE":
      return sel.targetPlace != null && entry.rang === sel.targetPlace ? "won" : "lost";
    case "EXACT_TIME":
      // au dixième : les deux côtés sont arrondis au dixième (voir parseTempsToSeconds)
      return sel.predictedTimeSeconds != null && entry.tempsSeconds != null
        && entry.tempsSeconds === sel.predictedTimeSeconds ? "won" : "lost";
    case "EXACT_TIME_SECOND":
      // à la seconde : on compare les temps arrondis à la seconde entière
      return sel.predictedTimeSeconds != null && entry.tempsSeconds != null
        && Math.round(entry.tempsSeconds) === Math.round(sel.predictedTimeSeconds) ? "won" : "lost";
    default: return "lost";
  }
}

// Construit, pour une compétition donnée, une map catégorie → (nom normalisé
// → résultat). Récupère TOUTES les lignes (y compris Abs/Abd/Dsq, sans rang)
// pour pouvoir distinguer void (Abs) de perte sèche (Abd/Dsq) — avant ce
// correctif, ces trois statuts étaient tous traités comme "athlète introuvable"
// (void), ce qui ne pénalisait jamais un abandon ou une disqualification.
async function fetchResultsByCategory(
  supabase: ReturnType<typeof createAdminSupabase>,
  competitionId: string
): Promise<Map<string, Map<string, ResultEntry>>> {
  const { data } = await supabase
    .from("resultats")
    .select("categorie, nom, rang, temps, dns, dnf, dsq")
    .eq("competition_id", competitionId);

  const resultsByCategory = new Map<string, Map<string, ResultEntry>>();
  for (const r of (data ?? [])) {
    if (!r.categorie || !r.nom) continue;
    const catMap = resultsByCategory.get(r.categorie) ?? new Map<string, ResultEntry>();
    catMap.set(normalize(r.nom), {
      rang:         r.rang,
      tempsSeconds: parseTempsToSeconds(r.temps),
      dns:          !!r.dns,
      dnf:          !!r.dnf,
      dsq:          !!r.dsq,
    });
    resultsByCategory.set(r.categorie, catMap);
  }
  return resultsByCategory;
}

type BetRow = {
  id:             string;
  user_id:        string;
  competition_id: string;
  selections:     Selection[];
  stake:          number;
  gain_potentiel: number;
  cote_totale:    number;
};

function normalize(s: string) {
  return s.trim().replace(/\s+/g, " ").toUpperCase();
}

// Exécute `worker` sur chaque élément avec au plus `concurrency` en vol
// simultanément — évite à la fois le traitement strictement séquentiel (trop
// lent, cause du 504 sur une compétition à beaucoup de paris) et une rafale
// totalement non bornée (risque de saturer le pool de connexions Supabase).
async function runWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let index = 0;
  async function next(): Promise<void> {
    const i = index++;
    if (i >= items.length) return;
    await worker(items[i]);
    return next();
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()));
}

// POST /api/admin/competitions/[id]/close
// 1. Vérifie que des résultats existent
// 2. Règle tous les paris en attente sur cette compétition
// 3. Marque la compétition comme "closed"
//
// Idempotent et sûr à relancer : ne traite que les paris encore "pending"
// (les paris déjà réglés lors d'un appel précédent — ex. interrompu par un
// 504 — sont automatiquement ignorés au prochain appel, sans double crédit).
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const competitionId = params.id;
  const supabase = createAdminSupabase();

  // ── 1. Vérifier que des résultats existent ──────────────────────
  const { count: resultCount, error: resultCountErr } = await supabase
    .from("resultats")
    .select("id", { count: "exact", head: true })
    .eq("competition_id", competitionId);

  if (resultCountErr) {
    return NextResponse.json(
      { error: `Erreur lors de la vérification des résultats : ${resultCountErr.message}` },
      { status: 500 }
    );
  }

  if (!resultCount || resultCount === 0) {
    return NextResponse.json(
      { error: "Aucun résultat importé. Importe les résultats avant de clôturer." },
      { status: 422 }
    );
  }

  // ── 2. Récupérer tous les résultats classés par catégorie ────────
  const resultsByCategory = await fetchResultsByCategory(supabase, competitionId);

  if (resultsByCategory.size === 0) {
    return NextResponse.json(
      { error: "Aucun résultat classé (rang) trouvé dans les résultats. Vérifie l'import." },
      { status: 422 }
    );
  }

  // ── 3. Récupérer les paris en attente touchant cette compétition ─
  // Un pari multi-compétition a competition_id = null (cf. /api/user/bets),
  // donc un filtre .eq("competition_id", ...) ne le trouvait jamais — ces
  // paris restaient "pending" pour toujours, mise déjà débitée, jamais
  // réglés. On cherche désormais par containment JSONB : tout pari dont au
  // moins une sélection référence cette compétition, mono ou multi-comp.
  // .contains() sérialise différemment selon le type reçu : un tableau JS
  // est traité comme un ARRAY Postgres natif ({a,b}), pas comme du JSONB —
  // il faut donc passer la chaîne déjà encodée pour obtenir l'opérateur
  // JSONB "cs." attendu par selections (jsonb, tableau d'objets).
  const { data: pendingBets, error: pendingBetsErr } = await supabase
    .from("bets")
    .select("id, user_id, competition_id, selections, stake, gain_potentiel, cote_totale")
    .eq("status", "pending")
    .contains("selections", JSON.stringify([{ competitionId }]));

  if (pendingBetsErr) {
    return NextResponse.json(
      { error: `Erreur lors de la récupération des paris : ${pendingBetsErr.message}` },
      { status: 500 }
    );
  }

  const bets: BetRow[] = (pendingBets ?? []).map(b => ({
    ...b,
    selections:     Array.isArray(b.selections) ? b.selections : [],
    stake:          Number(b.stake),
    gain_potentiel: Number(b.gain_potentiel),
    cote_totale:    Number(b.cote_totale),
  }));

  const now = new Date().toISOString();
  let won = 0, lost = 0, deferred = 0, cancelled = 0;
  const totalPaid: Record<string, number> = {};
  const failedSettlements: { betId: string; userId: string; error: string }[] = [];

  // Traités en parallèle (bornés) : chaque pari ne touche que sa propre
  // ligne + le solde de SON joueur (RPC atomique déjà en place), donc aucune
  // contention entre paris différents — seul le débit/crédit multiple sur
  // UN MÊME joueur reste sérialisé par l'atomicité de la RPC en base.
  async function settleBet(bet: BetRow): Promise<void> {
    // Évaluer chaque sélection de cette compétition
    let anyLost = false;
    let hasSelFromThisComp = false;
    let competitionNom = "";
    // Sélections "void" (Abs/DNS) : ne perdent ni ne gagnent, comptent pour
    // une cote de 1 dans le calcul du gain (voir plus bas) plutôt que leur
    // cote d'origine — un athlète absent n'aurait jamais dû faire gagner ni
    // perdre un combiné.
    const voidSelections: Selection[] = [];

    for (const sel of bet.selections) {
      if (sel.competitionId !== competitionId) continue;
      hasSelFromThisComp = true;
      competitionNom = sel.competitionNom;

      const outcome = selectionOutcome(sel, resultsByCategory.get(sel.categorie));
      if (outcome === "lost") anyLost = true;
      if (outcome === "void") voidSelections.push(sel);
    }

    if (!hasSelFromThisComp) return;

    // Pari multi-compétition (accumulateur) : une jambe gagnée dans CETTE
    // compétition ne suffit pas à régler le pari — il faut connaître le sort
    // des sélections des AUTRES compétitions référencées avant de payer.
    // Une jambe perdue ici, en revanche, suffit à perdre tout le pari
    // immédiatement, quel que soit l'état des autres jambes.
    let allWon = !anyLost;
    if (allWon) {
      const otherCompIds = [...new Set(
        bet.selections.map(s => s.competitionId).filter(id => id !== competitionId)
      )];
      if (otherCompIds.length > 0) {
        const { data: otherComps } = await supabase
          .from("competitions")
          .select("id, status")
          .in("id", otherCompIds);
        const allOthersClosed =
          (otherComps ?? []).length === otherCompIds.length &&
          (otherComps ?? []).every(c => c.status === "closed");

        if (!allOthersClosed) {
          // Une autre jambe du pari n'a pas encore eu lieu — on ne règle
          // rien pour l'instant, le pari reste "pending".
          deferred++;
          return;
        }

        // Toutes les autres compétitions référencées sont déjà clôturées :
        // on revérifie leurs résultats pour CE pari (ce sont elles qui,
        // avant ce fix, ne trouvaient jamais ce pari lors de leur propre
        // clôture — on complète donc la vérification ici).
        for (const otherCompId of otherCompIds) {
          const otherResultsByCategory = await fetchResultsByCategory(supabase, otherCompId);
          for (const sel of bet.selections) {
            if (sel.competitionId !== otherCompId) continue;
            const outcome = selectionOutcome(sel, otherResultsByCategory.get(sel.categorie));
            if (outcome === "lost") allWon = false;
            if (outcome === "void") voidSelections.push(sel);
          }
        }
      }
    }

    if (!allWon) {
      // ── Paris perdu ──────────────────────────────────────────────
      await supabase
        .from("bets")
        .update({ status: "lost", settled_at: now })
        .eq("id", bet.id);
      lost++;
      await notifyUser(supabase, bet.user_id, {
        type: "bet_lost",
        title: "Pari perdu",
        body: `${competitionNom} — dommage, ce sera pour la prochaine !`,
        url: "/app?view=profil",
      });
      return;
    }

    const remainingCount = bet.selections.length - voidSelections.length;

    if (remainingCount <= 0) {
      // ── Coupon entièrement void (tous les athlètes absents) ────────
      // Ni gagné ni perdu : mise remboursée intégralement, comme une
      // annulation (voir DELETE /api/user/bets/[id]).
      const { data: refundBalance, error: refundErr } = await supabase.rpc("increment_user_balance", {
        user_uuid: bet.user_id,
        delta:     bet.stake,
      });

      if (refundErr) {
        console.error(`[close] remboursement (void) échoué pour le pari ${bet.id}:`, refundErr);
        failedSettlements.push({ betId: bet.id, userId: bet.user_id, error: refundErr.message });
        return;
      }
      void refundBalance;

      await supabase
        .from("bets")
        .update({ status: "cancelled", settled_at: now })
        .eq("id", bet.id);

      await supabase.from("transactions").insert({
        user_id:     bet.user_id,
        type:        "refund",
        amount:      bet.stake,
        bet_id:      bet.id,
        description: `Absent(s) aux résultats · ${bet.selections.map(s => s.nom).join(", ")}`,
      });

      cancelled++;
      await notifyUser(supabase, bet.user_id, {
        type: "bet_cancelled",
        title: "Pari annulé",
        body: `${competitionNom} — athlète absent des résultats, ta mise de ${bet.stake.toLocaleString("fr-FR")} cr t'est remboursée.`,
        url: "/app",
      });
      return;
    }

    // ── Toutes les sélections restantes (hors void) ont gagné ──────────
    // Neutralise chaque jambe void en excluant sa cote d'origine du produit
    // (équivalent à une cote de 1) et recalcule le bonus combiné sur le
    // nombre de sélections RÉELLEMENT en jeu — une jambe void "ne compte
    // pour rien", elle ne doit donc plus peser ni dans la cote totale ni
    // dans le palier de bonus. Le gain_potentiel figé à la mise ne peut pas
    // être utilisé tel quel : il incluait encore la cote de la jambe void.
    const voidCoteProduct = voidSelections.reduce((p, s) => p * s.cote, 1);
    const adjustedCoteTotale = voidCoteProduct > 0 ? bet.cote_totale / voidCoteProduct : bet.cote_totale;
    const adjustedGain = Math.round(bet.stake * adjustedCoteTotale * comboBonusFor(remainingCount) * 100) / 100;

    // Créditer le gain — si le RPC échoue, on ne marque PAS le pari
    // gagné ni n'insère de transaction : mieux vaut le laisser en
    // attente (traitable manuellement) qu'afficher un gain jamais crédité.
    const { error: balErr } = await supabase.rpc("increment_user_balance", {
      user_uuid: bet.user_id,
      delta:     adjustedGain,
    });

    if (balErr) {
      console.error(`[close] increment_user_balance échoué pour le pari ${bet.id}:`, balErr);
      failedSettlements.push({ betId: bet.id, userId: bet.user_id, error: balErr.message });
      return;
    }

    await supabase
      .from("bets")
      .update({
        status:         "won",
        gain_reel:      adjustedGain,
        cote_totale:    Math.round(adjustedCoteTotale * 10000) / 10000,
        settled_at:     now,
      })
      .eq("id", bet.id);

    await supabase.from("transactions").insert({
      user_id:     bet.user_id,
      type:        "win",
      amount:      adjustedGain,
      bet_id:      bet.id,
      description: `Victoire · ${bet.selections.map(s => s.nom).join(", ")}`,
    });

    won++;
    totalPaid[bet.user_id] = (totalPaid[bet.user_id] ?? 0) + adjustedGain;
    await notifyUser(supabase, bet.user_id, {
      type: "bet_won",
      title: "Pari gagné 🎉",
      body: `${competitionNom} — tu remportes ${Math.round(adjustedGain).toLocaleString("fr-FR")} crédits !`,
      url: "/app?view=profil",
    });
  }

  await runWithConcurrency(bets, 10, settleBet);

  // ── 4. Marquer la compétition comme terminée ────────────────────
  await supabase
    .from("competitions")
    .update({ status: "closed" })
    .eq("id", competitionId);

  return NextResponse.json({
    ok:           true,
    betsSettled:  won + lost + cancelled,
    won,
    lost,
    cancelled,
    deferred,
    categories:   resultsByCategory.size,
    totalPaid:    Object.values(totalPaid).reduce((a, b) => a + b, 0),
    ...(failedSettlements.length > 0 ? { failedSettlements } : {}),
  });
}
