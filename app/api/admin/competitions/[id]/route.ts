import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";

// PATCH /api/admin/competitions/[id] — met à jour les infos ou le statut
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();

  // On n'accepte que les champs modifiables
  const allowed: Record<string, unknown> = {};
  if (body.nom        !== undefined) allowed.nom        = body.nom;
  if (body.date       !== undefined) allowed.date       = body.date || null;
  if (body.discipline !== undefined) allowed.discipline = body.discipline || null;
  if (body.lieu       !== undefined) allowed.lieu       = body.lieu || null;
  if (body.status     !== undefined) allowed.status     = body.status;
  if (body.type_competition !== undefined) allowed.type_competition = body.type_competition || null;

  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from("competitions")
    .update(allowed)
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/competitions/[id] — supprime une compétition (et ses participants via cascade)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from("competitions")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
