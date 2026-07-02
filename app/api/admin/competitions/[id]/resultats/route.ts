import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";

// GET /api/admin/competitions/[id]/resultats
// Retourne tous les résultats importés pour cette compétition.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("resultats")
    .select("id, categorie, rang, dossard, nom, club, temps, points, dns, dnf")
    .eq("competition_id", params.id)
    .order("categorie", { ascending: true })
    .order("rang",       { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

// POST /api/admin/competitions/[id]/resultats
// Enregistre des résultats en saisie manuelle (remplace toute la catégorie si fourni).
// Body: { resultats: Array<{ categorie, rang, dossard, nom, club, temps, points, dns, dnf }> }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const rows: {
    categorie: string;
    rang:      number | null;
    dossard:   number | null;
    nom:       string;
    club?:     string | null;
    temps?:    string | null;
    points?:   number | null;
    dns?:      boolean;
    dnf?:      boolean;
  }[] = body.resultats ?? [];

  if (!rows.length) {
    return NextResponse.json({ error: "Aucun résultat fourni" }, { status: 400 });
  }

  const supabase = createAdminSupabase();

  // Déduire les catégories touchées pour purger avant réinsertion
  const categories = [...new Set(rows.map(r => r.categorie))];
  const { error: delErr } = await supabase
    .from("resultats")
    .delete()
    .eq("competition_id", params.id)
    .in("categorie", categories);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const toInsert = rows.map(r => ({
    competition_id: params.id,
    categorie:      r.categorie,
    rang:           r.rang   ?? null,
    dossard:        r.dossard ?? null,
    nom:            r.nom,
    club:           r.club   ?? null,
    temps:          r.temps  ?? null,
    points:         r.points ?? null,
    dns:            r.dns    ?? false,
    dnf:            r.dnf    ?? false,
  }));

  const { error: insErr, count } = await supabase
    .from("resultats")
    .insert(toInsert, { count: "exact" });

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, inserted: count ?? toInsert.length });
}

// DELETE /api/admin/competitions/[id]/resultats
// Supprime tous les résultats de la compétition (reset).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from("resultats")
    .delete()
    .eq("competition_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
