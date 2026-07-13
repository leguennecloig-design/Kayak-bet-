import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";

// PATCH /api/admin/app-announcements/[id] — { active: boolean } pour
// republier/dépublier une annonce passée sans en recréer une nouvelle.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "Paramètre invalide" }, { status: 400 });
  }

  const supabase = createAdminSupabase();

  if (body.active) {
    await supabase.from("app_announcements").update({ active: false }).eq("active", true);
  }

  const { error } = await supabase
    .from("app_announcements")
    .update({ active: body.active })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/app-announcements/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const supabase = createAdminSupabase();
  const { error } = await supabase.from("app_announcements").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
