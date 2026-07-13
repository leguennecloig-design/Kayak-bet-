import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase, createServerSupabase } from "@/lib/supabase-server";
import { displayName, initials } from "@/lib/display-name";

// GET /api/users/search?q=... — recherche de joueurs par pseudo, pour
// l'ajout d'amis. Authentifié (pas besoin d'admin), ne renvoie que des
// champs publics (déjà exposés via le classement/profil public).
export async function GET(req: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ users: [] });

  const adminSb = createAdminSupabase();
  const { data, error } = await adminSb
    .from("users")
    .select("id, username, email, avatar_url")
    .ilike("username", `%${q}%`)
    .neq("id", user.id)
    .order("username", { ascending: true })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    users: (data ?? []).map(u => {
      const name = displayName(u);
      return { id: u.id, username: name, initials: initials(name), avatarUrl: u.avatar_url ?? null };
    }),
  });
}
