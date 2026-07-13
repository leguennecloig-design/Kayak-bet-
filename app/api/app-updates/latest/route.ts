import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-server";

// GET /api/app-updates/latest — annonce de mise à jour active la plus
// récente (ou null). Public, pas d'auth requise.
export async function GET() {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("app_announcements")
    .select("id, version, title, changelog, cta_label, cta_url, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json(null);

  return NextResponse.json({
    id:        data.id,
    version:   data.version,
    title:     data.title,
    changelog: Array.isArray(data.changelog) ? data.changelog : [],
    ctaLabel:  data.cta_label,
    ctaUrl:    data.cta_url,
  });
}
