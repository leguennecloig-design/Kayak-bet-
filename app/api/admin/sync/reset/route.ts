import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const target: string = body.target ?? "competitions"; // "competitions" | "all"

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Supprimer dans l'ordre des FK — on s'arrête au premier échec pour ne
  // pas continuer sur un état partiellement supprimé sans le signaler.
  const tables = ["ffck_resultats", "ffck_courses", "ffck_competitions"];
  if (target === "all") tables.push("athletes");

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      return NextResponse.json(
        { success: false, error: `Échec de la suppression de "${table}" : ${error.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, target });
}
