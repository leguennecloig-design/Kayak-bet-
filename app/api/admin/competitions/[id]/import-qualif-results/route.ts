import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { parseQualifResults } from "@/lib/algo/qualif-results-parser";

function normalize(s: string) {
  return s.trim().replace(/\s+/g, " ").toUpperCase();
}

// POST /api/admin/competitions/[id]/import-qualif-results
// Compétition QUALIF uniquement (voir competitions.marche_qualif_finale) —
// importe juste la liste des qualifiés (+ Abs éventuels) par catégorie, voir
// lib/algo/qualif-results-parser.ts. Tout participant du départ non listé en
// "Qualifiés" et non "Abs" est automatiquement marqué non qualifié (perdu).
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
  const parsed = parseQualifResults(content);

  if (parsed.categories.length === 0) {
    return NextResponse.json(
      { error: "Aucune catégorie reconnue dans ce fichier. Vérifie le format (\"### <Libellé> (<CODE>)\" suivi de \"Qualifiés :\" puis un nom par ligne)." },
      { status: 422 }
    );
  }

  const { data: participants, error: partErr } = await supabase
    .from("participants")
    .select("id, nom, categorie")
    .eq("competition_id", params.id);
  if (partErr) return NextResponse.json({ error: partErr.message }, { status: 500 });

  const byCategoryByName = new Map<string, Map<string, string>>(); // categorie -> normalized nom -> participant id
  for (const p of participants ?? []) {
    const map = byCategoryByName.get(p.categorie) ?? new Map<string, string>();
    map.set(normalize(p.nom), p.id);
    byCategoryByName.set(p.categorie, map);
  }

  const unmatched: string[] = [];
  let qualifiedCount = 0;
  let absCount = 0;
  let nonQualifiedCount = 0;

  for (const cat of parsed.categories) {
    const nameMap = byCategoryByName.get(cat.code);
    if (!nameMap) {
      unmatched.push(`Catégorie "${cat.code}" introuvable dans la startlist de cette compétition`);
      continue;
    }

    const decided = new Set<string>(); // participant ids déjà traités (qualifié ou abs)

    for (const rawName of cat.qualifies) {
      const id = nameMap.get(normalize(rawName));
      if (!id) { unmatched.push(`"${rawName}" (${cat.code}) : aucun participant correspondant`); continue; }
      await supabase.from("participants").update({ qualified_finale: true, dns: false }).eq("id", id);
      decided.add(id);
      qualifiedCount++;
    }

    for (const rawName of cat.abs) {
      const id = nameMap.get(normalize(rawName));
      if (!id) { unmatched.push(`"${rawName}" (${cat.code}, Abs) : aucun participant correspondant`); continue; }
      await supabase.from("participants").update({ qualified_finale: false, dns: true }).eq("id", id);
      decided.add(id);
      absCount++;
    }

    // Tout le reste de la catégorie = présent mais non qualifié (perdu).
    for (const [, id] of nameMap) {
      if (decided.has(id)) continue;
      await supabase.from("participants").update({ qualified_finale: false, dns: false }).eq("id", id);
      nonQualifiedCount++;
    }
  }

  return NextResponse.json({
    ok: true,
    categories: parsed.categories.length,
    qualified: qualifiedCount,
    nonQualified: nonQualifiedCount,
    abs: absCount,
    unmatched,
    parseErrors: parsed.errors,
  });
}
