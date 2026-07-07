import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";

// POST /api/leagues/[id]/leave — quitte une ligue (le créateur ne peut pas
// quitter, il doit supprimer la ligue).
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase();
  const adminSb = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { data: league } = await adminSb
    .from("leagues")
    .select("id, creator_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!league) return NextResponse.json({ error: "Ligue introuvable" }, { status: 404 });
  if (league.creator_id === user.id) {
    return NextResponse.json({ error: "Le créateur ne peut pas quitter la ligue — il peut la supprimer" }, { status: 400 });
  }

  const { error } = await adminSb
    .from("league_members")
    .delete()
    .eq("league_id", params.id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
