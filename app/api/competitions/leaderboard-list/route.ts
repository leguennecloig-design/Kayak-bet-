import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-server";

// GET /api/competitions/leaderboard-list — compétitions pour lesquelles
// l'admin a publié un classement dédié (voir competitions.leaderboard_visible).
export async function GET() {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("competitions")
    .select("id, nom, date")
    .eq("leaderboard_visible", true)
    .order("date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    competitions: (data ?? []).map(c => ({ id: c.id, nom: c.nom, date: c.date })),
  });
}
