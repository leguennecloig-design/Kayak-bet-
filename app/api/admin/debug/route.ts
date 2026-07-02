import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";

// GET /api/admin/debug — dump des valeurs réelles de la table competitions
// À supprimer après diagnostic
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const supabase = createAdminSupabase();

  const { data, error } = await supabase
    .from("competitions")
    .select("id, nom, date, discipline, lieu, status, ffck_inscription_code, ffck_match_status")
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ data, error, count: data?.length ?? 0 });
}
