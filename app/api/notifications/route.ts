import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";

// GET /api/notifications — liste les notifications récentes du joueur + le
// nombre de non-lues. Dégrade proprement si la migration 20260721 n'est pas
// appliquée (renvoie une liste vide plutôt que d'échouer).
export async function GET() {
  const supabase = createServerSupabase();
  const adminSb  = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { data, error } = await adminSb
    .from("notifications")
    .select("id, type, title, body, url, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ notifications: [], unread: 0, unavailable: true });

  const notifications = data ?? [];
  const unread = notifications.filter(n => n.read_at == null).length;
  return NextResponse.json({ notifications, unread });
}

// POST /api/notifications { markAllRead: true } — marque toutes comme lues.
export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const adminSb  = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body?.markAllRead) {
    await adminSb
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
  }
  return NextResponse.json({ ok: true });
}
