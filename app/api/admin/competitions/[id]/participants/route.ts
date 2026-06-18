import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";

// POST /api/admin/competitions/[id]/participants — ajoute un participant
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { nom, pays, cote } = await req.json();

  if (!nom?.trim()) {
    return NextResponse.json({ error: "Le nom est obligatoire" }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("participants")
    .insert({
      competition_id: params.id,
      nom: nom.trim(),
      pays: pays?.trim() || null,
      cote: cote ? parseFloat(cote) : null,
    })
    .select("id, nom, pays, cote")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
