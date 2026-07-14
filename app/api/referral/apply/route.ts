import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";
import { displayName } from "@/lib/display-name";
import { notifyUser } from "@/lib/notifications/create";
import { registerCompetitionReferral } from "@/lib/referral/competition-referral";

const REFERRAL_BONUS = 400;

// POST /api/referral/apply { code } — applique un code de parrainage à
// l'utilisateur connecté (une seule fois par compte). Crédite le parrain
// ET le filleul de REFERRAL_BONUS crédits chacun.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const adminSb  = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { code, compId } = await req.json().catch(() => ({}));
  const trimmed = String(code ?? "").trim().toUpperCase();
  if (!trimmed) return NextResponse.json({ ok: false, reason: "no_code" });

  const { data: referrer } = await adminSb
    .from("users")
    .select("id")
    .eq("referral_code", trimmed)
    .maybeSingle();

  if (!referrer || referrer.id === user.id) {
    return NextResponse.json({ ok: false, reason: "invalid_code" });
  }

  // Lien de compétition (?ref=CODE capturé depuis /c/[id]) : enregistre
  // l'intention de parrainage liée à cette compétition précise — le bonus de
  // 200 cr (voir POST /api/user/bets) ne tombe qu'au premier pari du filleul
  // sur CETTE compétition, jamais ici. Distinct du bonus de bienvenue
  // (REFERRAL_BONUS) ci-dessous, qui lui tombe immédiatement à l'inscription.
  if (compId) {
    await registerCompetitionReferral(adminSb, trimmed, user.id, compId);
  }

  // Mise à jour atomique conditionnée à `referred_by IS NULL` : élimine la
  // course entre deux requêtes concurrentes (deux codes envoyés en parallèle
  // par le même compte) qui, avec un simple SELECT-puis-UPDATE, pouvaient
  // toutes les deux lire "pas encore parrainé" avant qu'aucune n'écrive, et
  // donc créditer le même compte deux fois. Seule la requête qui gagne la
  // course trouve une ligne à mettre à jour ; l'autre reçoit `updated: null`
  // et s'arrête sans créditer personne.
  const { data: updated, error: updateErr } = await adminSb
    .from("users")
    .update({ referred_by: referrer.id })
    .eq("id", user.id)
    .is("referred_by", null)
    .select("id")
    .maybeSingle();
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json({ ok: false, reason: "already_referred" });
  }

  await adminSb.rpc("increment_user_balance", { user_uuid: referrer.id, delta: REFERRAL_BONUS });
  await adminSb.rpc("increment_user_balance", { user_uuid: user.id, delta: REFERRAL_BONUS });

  await adminSb.from("transactions").insert([
    {
      user_id: referrer.id,
      type: "referral_bonus",
      amount: REFERRAL_BONUS,
      description: "Parrainage — un ami a rejoint Kayakbet grâce à toi",
    },
    {
      user_id: user.id,
      type: "referral_bonus",
      amount: REFERRAL_BONUS,
      description: "Parrainage — bonus de bienvenue",
    },
  ]);

  // Prévenir le parrain qu'un filleul a rejoint grâce à son lien.
  const { data: filleul } = await adminSb.from("users").select("username, email").eq("id", user.id).maybeSingle();
  const nm = filleul ? displayName(filleul) : "Un nouveau joueur";
  await notifyUser(adminSb, referrer.id, {
    type: "referral_used",
    title: "Nouveau filleul ! 🎉",
    body: `${nm} a rejoint Kayakbet grâce à ton lien. +${REFERRAL_BONUS} crédits pour toi !`,
    url: "/app",
    actorId: user.id,
  });

  return NextResponse.json({ ok: true, bonus: REFERRAL_BONUS });
}
