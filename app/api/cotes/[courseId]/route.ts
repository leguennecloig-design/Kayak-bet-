import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  const { courseId } = params;
  const categorie = req.nextUrl.searchParams.get("categorie");

  const supabase = createAdminSupabase();

  let query = supabase
    .from("cotes")
    .select("*")
    .eq("course_id", courseId)
    .order("rang_espere", { ascending: true });

  if (categorie) {
    query = query.eq("categorie", categorie);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
