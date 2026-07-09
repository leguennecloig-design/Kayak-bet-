import { NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase-server";
import { displayName } from "@/lib/display-name";

// GET /api/referral — code de parrainage de l'utilisateur connecté + filleuls
export async function GET() {
  const supabase = createServerSupabase();
  const adminSb  = createAdminSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { data: me } = await adminSb
    .from("users")
    .select("referral_code")
    .eq("id", user.id)
    .single();

  const { data: referred } = await adminSb
    .from("users")
    .select("username, email, created_at")
    .eq("referred_by", user.id)
    .order("created_at", { ascending: false });

  const referredUsers = (referred ?? []).map(r => ({
    name: displayName(r),
    date: r.created_at,
  }));

  return NextResponse.json({
    code: me?.referral_code ?? null,
    referredCount: referredUsers.length,
    referredUsers,
  });
}
