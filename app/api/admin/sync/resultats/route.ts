import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createClient } from "@supabase/supabase-js";

const API_BASE = "https://api.classements-descente.plargentanck.fr";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type ApiResultat = {
  rang: number;
  code_bateau: string;
  coureurs: Array<{ prenom: string; nom: string; club: string }>;
  categorie: string;
  temps_chrono: number | null;
  points: number | null;
  dsq: boolean;
};

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const limit: number = body.limit ?? 10;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const start = Date.now();

  // Cache athletes en mémoire
  const { data: allAthletes } = await supabase.from("athletes").select("id, code_bateau");
  const athleteMap = new Map(allAthletes?.map((a) => [a.code_bateau, a.id]) ?? []);

  // Courses non synchronisées
  const { data: courses, error } = await supabase
    .from("ffck_courses")
    .select("id, code_course, ffck_competitions ( code_ffck, nom )")
    .is("synced_at", null)
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!courses?.length) return NextResponse.json({ success: true, resultats: 0, courses: 0, pending: 0 });

  let totalResultats = 0;
  let coursesDone = 0;

  for (const course of courses) {
    const comp = course.ffck_competitions as unknown as { code_ffck: number; nom: string } | null;
    if (!comp) continue;

    const resultats = await fetchJSON<ApiResultat[]>(
      `${API_BASE}/competitions/${comp.code_ffck}/races/${course.code_course}`
    );
    await sleep(150);

    if (!resultats?.length) {
      await supabase.from("ffck_courses").update({ synced_at: new Date().toISOString() }).eq("id", course.id);
      coursesDone++;
      continue;
    }

    const rows = resultats.map((r) => ({
      course_id:       course.id,
      athlete_id:      athleteMap.get(r.code_bateau) ?? null,
      code_bateau:     r.code_bateau,
      rang:            r.rang ?? null,
      categorie:       r.categorie,
      temps_chrono:    r.temps_chrono ?? null,
      points:          r.points ?? null,
      dsq:             r.dsq ?? false,
      coureur1_nom:    r.coureurs[0]?.nom ?? null,
      coureur1_prenom: r.coureurs[0]?.prenom ?? null,
      coureur1_club:   r.coureurs[0]?.club ?? null,
      coureur2_nom:    r.coureurs[1]?.nom ?? null,
      coureur2_prenom: r.coureurs[1]?.prenom ?? null,
      coureur2_club:   r.coureurs[1]?.club ?? null,
    }));

    const { error: insertErr } = await supabase
      .from("ffck_resultats")
      .upsert(rows, { onConflict: "course_id,code_bateau,categorie" });

    if (!insertErr) {
      totalResultats += rows.length;
      await supabase.from("ffck_courses").update({ synced_at: new Date().toISOString() }).eq("id", course.id);
    }
    coursesDone++;
  }

  // Compte restant
  const { count: pending } = await supabase
    .from("ffck_courses")
    .select("*", { count: "exact", head: true })
    .is("synced_at", null);

  return NextResponse.json({
    success: true,
    resultats: totalResultats,
    courses: coursesDone,
    pending: pending ?? 0,
    duration: Date.now() - start,
  });
}
