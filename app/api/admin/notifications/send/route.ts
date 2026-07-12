import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { notifyAllUsers } from "@/lib/notifications/create";

// POST /api/admin/notifications/send — diffusion manuelle à tous les abonnés
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const title = (body.title as string | undefined)?.trim();
  const message = (body.body as string | undefined)?.trim();
  const url = (body.url as string | undefined)?.trim() || undefined;

  if (!title || !message) {
    return NextResponse.json({ error: "Titre et message requis" }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const result = await notifyAllUsers(supabase, { type: "broadcast", title, body: message, url });

  return NextResponse.json({ ok: true, sent: result?.sent ?? 0 });
}
