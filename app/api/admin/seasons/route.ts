import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";

const SEASON_START_BALANCE = 3000;

// GET /api/admin/seasons — liste les saisons (plus récente d'abord)
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("seasons")
    .select("id, label, is_current, started_at, created_at")
    .order("started_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/admin/seasons { label } — crée une nouvelle saison courante et
// remet le solde de TOUS les comptes au montant de départ. Irréversible.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { label } = await req.json().catch(() => ({}));
  const trimmed = String(label ?? "").trim();
  if (!trimmed) return NextResponse.json({ error: "Libellé requis" }, { status: 400 });

  const supabase = createAdminSupabase();

  const { error: deactivateErr } = await supabase
    .from("seasons")
    .update({ is_current: false })
    .eq("is_current", true);
  if (deactivateErr) return NextResponse.json({ error: deactivateErr.message }, { status: 500 });

  const { data: season, error: insertErr } = await supabase
    .from("seasons")
    .insert({ label: trimmed, is_current: true })
    .select("id, label, is_current, started_at")
    .single();
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Remet tous les soldes à plat — filtre "id IS NOT NULL" volontairement
  // toujours vrai : PostgREST exige une clause WHERE explicite pour un UPDATE,
  // et ça concerne réellement tous les comptes.
  const { error: resetErr } = await supabase
    .from("users")
    .update({ balance: SEASON_START_BALANCE })
    .not("id", "is", null);
  if (resetErr) return NextResponse.json({ error: resetErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, season });
}
