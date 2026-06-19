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

  // Supprimer dans l'ordre des FK
  await supabase.from("ffck_resultats").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("ffck_courses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("ffck_competitions").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  if (target === "all") {
    await supabase.from("athletes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }

  return NextResponse.json({ success: true, target });
}
