import { adminGuard } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import CotesClient from "./CotesClient";

export default async function CotesPage() {
  await adminGuard();

  const supabase = createAdminSupabase();

  const { data: comps, error: compsError } = await supabase
    .from("ffck_competitions")
    .select(`
      id, nom, date_debut, code_niveau, code_type, nb_courses,
      ffck_courses ( id, code_course, libelle, nb_participants )
    `)
    .order("date_debut", { ascending: false });

  if (compsError) {
    console.error("[cotes/page] ffck_competitions:", compsError.message);
  }

  // Cotes existantes — ignoré si la table n'existe pas encore
  const { data: cotesCountRaw } = await supabase
    .from("cotes")
    .select("course_id");

  const cotesPerCourse = new Map<string, number>();
  for (const row of cotesCountRaw ?? []) {
    const key = row.course_id as string;
    cotesPerCourse.set(key, (cotesPerCourse.get(key) ?? 0) + 1);
  }

  const competitions = (comps ?? []).map((c) => ({
    id: c.id as string,
    nom: c.nom as string,
    date_debut: c.date_debut as string | null,
    code_niveau: c.code_niveau as string | null,
    code_type: c.code_type as string | null,
    nb_courses: c.nb_courses as number | null,
    courses: ((c.ffck_courses ?? []) as {
      id: string;
      code_course: string;
      libelle: string | null;
      nb_participants: number | null;
    }[]).map((course) => ({
      ...course,
      cotes_count: cotesPerCourse.get(course.id) ?? 0,
    })),
  }));

  return <CotesClient competitions={competitions} />;
}
