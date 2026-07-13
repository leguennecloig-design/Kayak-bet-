import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";

// DELETE /api/admin/competitions/[id]/participants/[pid]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; pid: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from("participants")
    .delete()
    .eq("id", params.pid)
    .eq("competition_id", params.id); // double vérification pour éviter une suppression cross-competition

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

const ADVANCED_COTE_FIELDS = ["cote_top3", "cote_top5", "cote_top10"] as const;

// PATCH /api/admin/competitions/[id]/participants/[pid] — met à jour cote / nom / pays
// (table participants) et, si fournis, cote_top3/cote_top5/cote_top10 (table
// cotes, jointe par code_bateau — ces cotes avancées ne vivent pas sur
// participants).
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; pid: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();
  const allowed: Record<string, unknown> = {};
  if (body.nom  !== undefined) allowed.nom  = body.nom;
  if (body.pays !== undefined) allowed.pays = body.pays || null;
  if (body.cote !== undefined) {
    const parsed = body.cote ? parseFloat(body.cote) : null;
    if (parsed !== null && Number.isNaN(parsed)) {
      return NextResponse.json({ error: "Cote invalide" }, { status: 400 });
    }
    allowed.cote = parsed;
  }

  const advancedUpdate: Record<string, number | null> = {};
  for (const field of ADVANCED_COTE_FIELDS) {
    if (body[field] === undefined) continue;
    const parsed = body[field] === null || body[field] === "" ? null : parseFloat(body[field]);
    if (parsed !== null && Number.isNaN(parsed)) {
      return NextResponse.json({ error: "Cote invalide" }, { status: 400 });
    }
    advancedUpdate[field] = parsed;
  }

  const supabase = createAdminSupabase();

  if (Object.keys(allowed).length > 0) {
    const { error } = await supabase
      .from("participants")
      .update(allowed)
      .eq("id", params.pid)
      .eq("competition_id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (Object.keys(advancedUpdate).length > 0) {
    const { data: participant, error: readErr } = await supabase
      .from("participants")
      .select("code_bateau")
      .eq("id", params.pid)
      .eq("competition_id", params.id)
      .maybeSingle();
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
    if (!participant?.code_bateau) {
      return NextResponse.json(
        { error: "Cotes avancées indisponibles pour ce participant (pas de code_bateau)" },
        { status: 422 }
      );
    }

    const { error } = await supabase
      .from("cotes")
      .update(advancedUpdate)
      .eq("competition_id", params.id)
      .eq("code_bateau", participant.code_bateau);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
