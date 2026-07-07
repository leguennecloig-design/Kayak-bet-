import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import {
  calculateCotesForCourse,
  calculateCotesFromStartlist,
  saveCotes,
} from "@/lib/algo/cotes-engine";
import { parseResultFile } from "@/lib/algo/result-parser";
import { calculateSprintFinaleCotes } from "@/lib/algo/sprint-finale-engine";
import { calculateMassStartCotes } from "@/lib/algo/mass-start-engine";

// Sprint Finale / Mass Start : requête multipart (fichier de résultats requis).
// Standard / recalcul global : requête JSON, comportement inchangé.
async function handleSpecialFormat(req: NextRequest) {
  const formData = await req.formData();
  const courseId = formData.get("courseId") as string | null;
  const format = formData.get("format") as "sprint_finale" | "mass_start" | null;
  const fichier = formData.get("fichier") as File | null;

  if (!courseId || !format) {
    return NextResponse.json({ error: "courseId et format requis" }, { status: 400 });
  }
  if (!fichier) {
    return NextResponse.json({ error: "Fichier de résultats requis" }, { status: 400 });
  }

  const content = await fichier.text();
  const parsed = parseResultFile(content, fichier.name);
  if (parsed.data.length === 0) {
    return NextResponse.json(
      { error: "Fichier invalide ou vide", details: parsed.errors },
      { status: 400 }
    );
  }

  const supabase = createAdminSupabase();
  const categories = [...new Set(parsed.data.map((r) => r.categorie))];

  let total = 0;
  const perCategory: Record<string, number> = {};
  const engineErrors: string[] = [];

  for (const cat of categories) {
    try {
      const cotes = format === "sprint_finale"
        ? await calculateSprintFinaleCotes(courseId, cat, parsed.data, supabase)
        : await calculateMassStartCotes(courseId, cat, parsed.data, supabase);

      if (cotes.length > 0) {
        const stamped = cotes.map((c) => ({ ...c, format_course: format }));
        await saveCotes(courseId, stamped, supabase);
        total += cotes.length;
        perCategory[cat] = cotes.length;
      }
    } catch (e) {
      engineErrors.push(`${cat}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    total,
    categories: perCategory,
    parseErrors: parsed.errors,
    ...(engineErrors.length > 0 ? { engineErrors } : {}),
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    return handleSpecialFormat(req);
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
