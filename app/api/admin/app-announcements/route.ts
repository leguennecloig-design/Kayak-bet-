import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";

// GET /api/admin/app-announcements — historique complet, plus récentes d'abord.
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("app_announcements")
    .select("id, version, title, changelog, cta_label, cta_url, active, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcements: data ?? [] });
}

// POST /api/admin/app-announcements — crée une nouvelle annonce et désactive
// automatiquement les précédentes (une seule active à la fois).
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const version = String(body.version ?? "").trim();
  const title = String(body.title ?? "").trim() || "Nouvelle version disponible";
  const changelog = Array.isArray(body.changelog)
    ? body.changelog.map((l: unknown) => String(l).trim()).filter(Boolean)
    : [];
  const ctaLabel = body.ctaLabel ? String(body.ctaLabel).trim() : null;
  const ctaUrl = body.ctaUrl ? String(body.ctaUrl).trim() : null;

  if (!version) {
    return NextResponse.json({ error: "Le numéro de version est requis" }, { status: 400 });
  }
  if (changelog.length === 0) {
    return NextResponse.json({ error: "Ajoute au moins une nouveauté" }, { status: 400 });
  }

  const supabase = createAdminSupabase();

  await supabase.from("app_announcements").update({ active: false }).eq("active", true);

  const { data, error } = await supabase
    .from("app_announcements")
    .insert({
      version, title, changelog,
      cta_label: ctaLabel, cta_url: ctaUrl,
      active: true,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
