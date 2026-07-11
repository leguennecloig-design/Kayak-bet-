import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

// GET /api/season/current — libellé de la saison courante (public, lecture
// seule). Utilisé pour l'affichage ("Saison 2026 · N joueurs") plutôt que
// de garder ce texte figé en dur dans l'UI.
export async function GET() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("seasons")
    .select("label, started_at")
    .eq("is_current", true)
    .maybeSingle();

  return NextResponse.json({ label: data?.label ?? "Saison en cours" });
}
