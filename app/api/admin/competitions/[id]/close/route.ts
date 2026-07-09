import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { sendPushToUser } from "@/lib/push/send";

type Selection = {
  participantId:  string;
  nom:            string;
  cote:           number;
  competitionId:  string;
  competitionNom: string;
  categorie:      string;
};

type BetRow = {
  id:             string;
  user_id:        string;
  competition_id: string;
  selections:     Selection[];
  stake:          number;
  gain_potentiel: number;
};

function normalize(s: string) {
  return s.trim().replace(/\s+/g, " ").toUpperCase();
}

// POST /api/admin/competitions/[id]/close
// 1. Vérifie que des résultats existent
// 2. Règle tous les paris en attente sur cette compétition
// 3. Marque la compétition comme "closed"
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

  // ── 2. Récupérer les gagnants par catégorie (rang = 1) ──────────
  const { data: winners, error: winnersErr } = await supabase
    .from("resultats")
    .select("categorie, nom, rang")
    .eq("competition_id", competitionId)
    .eq("rang", 1);

  if (winnersErr) {
    return NextResponse.json(
      { error: `Erreur lors de la récupération des vainqueurs : ${winnersErr.message}` },
      { status: 500 }
    );
  }

  // Map : categorie → nom normalisé du gagnant
  const winnerMap = new Map<string, string>();
  for (const w of (winners ?? [])) {
    if (w.categorie && w.nom) winnerMap.set(w.categorie, normalize(w.nom));
  }

  if (winnerMap.size === 0) {
    return NextResponse.json(
      { error: "Aucun vainqueur (rang=1) trouvé dans les résultats. Vérifie l'import." },
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
    .select("id, user_id, competition_id, selections, stake, gain_potentiel")
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
  }));

  const now = new Date().toISOString();
  let won = 0, lost = 0, deferred = 0;
  const totalPaid: Record<string, number> = {};
  const failedSettlements: { betId: string; userId: string; error: string }[] = [];

  for (const bet of bets) {
    // Évaluer chaque sélection de cette compétition
    let anyLost = false;
    let hasSelFromThisComp = false;
    let competitionNom = "";

    for (const sel of bet.selections) {
      if (sel.competitionId !== competitionId) continue;
      hasSelFromThisComp = true;
      competitionNom = sel.competitionNom;

      const winner = winnerMap.get(sel.categorie);
      if (!winner) {
        // Catégorie sans résultat → sélection void, on considère comme gagnée
        // (évite de pénaliser pour une catégorie non importée)
        continue;
      }
      const selWon = normalize(sel.nom) === winner;
      if (!selWon) anyLost = true;
    }

    if (!hasSelFromThisComp) continue;

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
          continue;
        }

        // Toutes les autres compétitions référencées sont déjà clôturées :
        // on revérifie leurs résultats pour CE pari (ce sont elles qui,
        // avant ce fix, ne trouvaient jamais ce pari lors de leur propre
        // clôture — on complète donc la vérification ici).
        for (const otherCompId of otherCompIds) {
          const { data: otherResultats } = await supabase
            .from("resultats")
            .select("categorie, nom, rang")
            .eq("competition_id", otherCompId)
            .eq("rang", 1);
          const otherWinnerMap = new Map<string, string>();
          for (const w of (otherResultats ?? [])) {
            if (w.categorie && w.nom) otherWinnerMap.set(w.categorie, normalize(w.nom));
          }
          for (const sel of bet.selections) {
            if (sel.competitionId !== otherCompId) continue;
            const winner = otherWinnerMap.get(sel.categorie);
            if (!winner) continue;
            if (normalize(sel.nom) !== winner) allWon = false;
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
      try {
        await sendPushToUser(supabase, bet.user_id, {
          title: "Pari perdu",
          body: `${competitionNom} — dommage, ce sera pour la prochaine !`,
          url: "/app",
        });
      } catch (e) {
        console.error(`[close] push (perdu) échoué pour le pari ${bet.id}:`, e);
      }
    } else {
      // ── Toutes les sélections (de toutes les compétitions référencées) ont gagné ──
      // Créditer le gain — si le RPC échoue, on ne marque PAS le pari
      // gagné ni n'insère de transaction : mieux vaut le laisser en
      // attente (traitable manuellement) qu'afficher un gain jamais crédité.
      const { error: balErr } = await supabase.rpc("increment_user_balance", {
        user_uuid: bet.user_id,
        delta:     bet.gain_potentiel,
      });

      if (balErr) {
        console.error(`[close] increment_user_balance échoué pour le pari ${bet.id}:`, balErr);
        failedSettlements.push({ betId: bet.id, userId: bet.user_id, error: balErr.message });
        continue;
      }

      await supabase
        .from("bets")
        .update({ status: "won", gain_reel: bet.gain_potentiel, settled_at: now })
        .eq("id", bet.id);

      await supabase.from("transactions").insert({
        user_id:     bet.user_id,
        type:        "win",
        amount:      bet.gain_potentiel,
        bet_id:      bet.id,
        description: `Victoire · ${bet.selections.map(s => s.nom).join(", ")}`,
      });

      won++;
      totalPaid[bet.user_id] = (totalPaid[bet.user_id] ?? 0) + bet.gain_potentiel;
      try {
        await sendPushToUser(supabase, bet.user_id, {
          title: "Pari gagné 🎉",
          body: `${competitionNom} — tu remportes ${Math.round(bet.gain_potentiel).toLocaleString("fr-FR")} crédits !`,
          url: "/app",
        });
      } catch (e) {
        console.error(`[close] push (gagné) échoué pour le pari ${bet.id}:`, e);
      }
    }
  }

  // ── 4. Marquer la compétition comme terminée ────────────────────
  await supabase
    .from("competitions")
    .update({ status: "closed" })
    .eq("id", competitionId);

  return NextResponse.json({
    ok:           true,
    betsSettled:  won + lost,
    won,
    lost,
    deferred,
    categories:   winnerMap.size,
    totalPaid:    Object.values(totalPaid).reduce((a, b) => a + b, 0),
    ...(failedSettlements.length > 0 ? { failedSettlements } : {}),
  });
}
