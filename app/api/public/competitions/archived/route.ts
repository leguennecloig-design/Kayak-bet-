import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-server";

// GET /api/public/competitions/archived — compétitions clôturées que
// l'admin a explicitement archivées (voir competitions.archived), visibles
// par TOUS les joueurs dans l'onglet Compétitions, même ceux qui n'y ont
// pas parié. Public, pas d'auth requise.
export async function GET() {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("competitions")
    .select("id, nom, date, lieu, discipline")
    .eq("archived", true)
    .eq("status", "closed")
    .order("date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    competitions: (data ?? []).map(c => ({
      id: c.id, nom: c.nom, date: c.date, lieu: c.lieu, discipline: c.discipline,
    })),
  });
}
