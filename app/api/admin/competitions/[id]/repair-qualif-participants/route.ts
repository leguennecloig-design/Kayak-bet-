import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { parseQualifCotesFile } from "@/lib/algo/external-cotes-parser-qualif";

// POST /api/admin/competitions/[id]/repair-qualif-participants
// Compétition QUALIF uniquement — permet de ré-uploader le fichier de cotes
// ORIGINAL (celui utilisé à la création) pour ajouter les participants qui
// avaient été rejetés à l'époque (nom/club fusionnés, voir
// external-cotes-parser-qualif.ts — désormais corrigé pour créer quand même
// le participant avec un nom provisoire au lieu de l'abandonner). Idempotent :
// un participant déjà présent (même code_bateau) n'est jamais dupliqué, donc
// on peut re-uploader le même fichier sans risque.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const supabase = createAdminSupabase();

  const { data: comp } = await supabase
    .from("competitions")
    .select("marche_qualif_finale")
    .eq("id", params.id)
    .maybeSingle();
  if (!comp?.marche_qualif_finale) {
    return NextResponse.json({ error: "Cette compétition n'est pas une compétition qualif" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }
  const content = await file.text();
  const parsed = parseQualifCotesFile(content);

  if (parsed.categories.length === 0) {
    return NextResponse.json({ error: "Aucune catégorie reconnue dans ce fichier." }, { status: 422 });
  }

  const { data: existing, error: existingErr } = await supabase
    .from("participants")
    .select("code_bateau")
    .eq("competition_id", params.id);
  if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 });

  const existingCodes = new Set((existing ?? []).map((p) => p.code_bateau as string));

  const toInsert: {
    competition_id: string; nom: string; pays: string | null;
    cote: number | null; categorie: string; code_bateau: string; qualifies_finale: number;
  }[] = [];

  for (const cat of parsed.categories) {
    for (const a of cat.athletes) {
      const code_bateau = `${cat.code}-${a.dossard}`;
      if (existingCodes.has(code_bateau)) continue;
      toInsert.push({
        competition_id:   params.id,
        nom:              a.nom,
        pays:             a.club || null,
        cote:             a.cote_qualif_finale,
        categorie:        cat.code,
        code_bateau,
        qualifies_finale: cat.nb_qualifies,
      });
    }
  }

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from("participants").insert(toInsert);
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    added: toInsert.length,
    alreadyPresent: existingCodes.size,
    parseErrors: parsed.errors,
  });
}
