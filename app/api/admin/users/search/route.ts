import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";

// GET /api/admin/users/search?q=... — recherche par pseudo ou email (admin).
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ users: [] });

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, email, balance, avatar_url")
    .or(`username.ilike.%${q}%,email.ilike.%${q}%`)
    .order("username", { ascending: true })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    users: (data ?? []).map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      balance: Number(u.balance),
      avatarUrl: u.avatar_url,
    })),
  });
}
