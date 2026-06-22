import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import {
  calculateCotesForCourse,
  calculateCotesFromStartlist,
  saveCotes,
} from "@/lib/algo/cotes-engine";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json();
  const { courseId, all } = body as { courseId?: string; all?: boolean };

  const supabase = createAdminSupabase();

  const courseIds: string[] = [];

  if (all) {
    const { data: courses } = await supabase
      .from("ffck_courses")
      .select("id");
    if (courses) courseIds.push(...courses.map((c) => c.id));
  } else if (courseId) {
    courseIds.push(courseId);
  } else {
    return NextResponse.json({ error: "courseId ou all requis" }, { status: 400 });
  }

  const results: Record<string, { categories: string[]; total: number; error?: string }> = {};

  for (const id of courseIds) {
    try {
      // Détecter le type de source : startlist_entries ou ffck_resultats
      const { count: startlistCount } = await supabase
        .from("startlist_entries")
        .select("id", { count: "exact", head: true })
        .eq("course_id", id);

      let categories: string[] = [];
      let total = 0;

      if ((startlistCount ?? 0) > 0) {
        // Compétition importée via startlist PDF — toutes catégories (mono + biplace C2)
        const { data: cats } = await supabase
          .from("startlist_entries")
          .select("categorie")
          .eq("course_id", id);
        categories = [...new Set((cats ?? []).map((r: { categorie: string }) => r.categorie))];

        for (const cat of categories) {
          const cotes = await calculateCotesFromStartlist(id, cat, supabase);
          if (cotes.length > 0) {
            await saveCotes(id, cotes, supabase);
            total += cotes.length;
          }
        }
      } else {
        // Compétition FFCK — résultats officiels
        const { data: cats } = await supabase
          .from("ffck_resultats")
          .select("categorie")
          .eq("course_id", id)
          .eq("dsq", false)
          .not("rang", "is", null);
        categories = [...new Set((cats ?? []).map((r: { categorie: string }) => r.categorie))];

        for (const cat of categories) {
          const cotes = await calculateCotesForCourse(id, cat, supabase);
          if (cotes.length > 0) {
            await saveCotes(id, cotes, supabase);
            total += cotes.length;
          }
        }
      }

      results[id] = { categories, total };
    } catch (e) {
      results[id] = { categories: [], total: 0, error: String(e) };
    }
  }

  return NextResponse.json({ ok: true, results });
}
