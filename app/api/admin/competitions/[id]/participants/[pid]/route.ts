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

// PATCH /api/admin/competitions/[id]/participants/[pid] — met à jour cote / nom / pays
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
  if (body.cote !== undefined) allowed.cote = body.cote ? parseFloat(body.cote) : null;

  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from("participants")
    .update(allowed)
    .eq("id", params.pid)
    .eq("competition_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
