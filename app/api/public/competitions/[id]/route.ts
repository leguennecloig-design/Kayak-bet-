import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

// GET /api/public/competitions/[id]
// Route publique (aucune auth requise) : infos minimales d'une compétition
// publiée, pour la page d'invitation /c/[id]?ref=CODE. Ne renvoie rien pour
// une compétition en brouillon ou introuvable — jamais de fuite de données
// non publiques.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase();

  const { data: comp } = await supabase
    .from("competitions")
    .select("id, nom, date, lieu, discipline")
    .eq("id", params.id)
    .eq("status", "published")
    .maybeSingle();

  if (!comp) {
    return NextResponse.json({ error: "Compétition introuvable" }, { status: 404 });
  }

  return NextResponse.json(comp);
}
