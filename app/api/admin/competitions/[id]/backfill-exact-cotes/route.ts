import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { deriveExactMarketsFromCoteTop1 } from "@/lib/algo/bradley-terry";

// POST /api/admin/competitions/[id]/backfill-exact-cotes
// Complète rang_espere/sigma + cote_exact_place/temps pour les lignes `cotes`
// de cette compétition qui en sont dépourvues (ex : cotes importées depuis un
// fichier externe Top1/3/5/10 seulement, voir import-cotes-file). Sans effet
// sur les lignes déjà complètes.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const supabase = createAdminSupabase();

  const { data: rows, error } = await supabase
    .from("cotes")
    .select("code_bateau, cote_top1, nb_athletes_startlist, rang_espere")
    .eq("competition_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const toFix = (rows ?? []).filter(
    r => r.rang_espere == null && r.cote_top1 != null && Number(r.cote_top1) > 1
  );

  let updated = 0;
  const errors: string[] = [];
  for (const r of toFix) {
    const n = Number(r.nb_athletes_startlist) || 2;
    const derived = deriveExactMarketsFromCoteTop1(Number(r.cote_top1), n);
    const { error: updErr } = await supabase
      .from("cotes")
      .update({
        rang_espere:            derived.rang_espere,
        sigma:                  derived.sigma,
        cote_exact_place:       derived.cote_exact_place,
        cote_exact_time:        derived.cote_exact_time,
        cote_exact_time_second: derived.cote_exact_time_second,
      })
      .eq("competition_id", params.id)
      .eq("code_bateau", r.code_bateau);
    if (updErr) errors.push(`${r.code_bateau}: ${updErr.message}`);
    else updated++;
  }

  return NextResponse.json({
    ok: true,
    checked: rows?.length ?? 0,
    updated,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
