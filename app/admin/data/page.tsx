import { adminGuard } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import DataClient from "./DataClient";

type CompRow = {
  id: string;
  code_ffck: number;
  nom: string;
  date_debut: string;
  ville: string | null;
  code_niveau: string;
  nb_courses: number;
  est_national: boolean;
  ffck_courses: { synced_at: string | null }[];
};

export default async function DataPage() {
  await adminGuard();

  const supabase = createAdminSupabase();

  // Counts — on gère l'erreur si les tables n'existent pas encore
  async function safeCount(table: string): Promise<number> {
    const { count, error } = await (supabase as ReturnType<typeof createAdminSupabase>)
      .from(table)
      .select("*", { count: "exact", head: true });
    return error ? 0 : (count ?? 0);
  }

  const [athletes, competitions, courses, resultats] = await Promise.all([
    safeCount("athletes"),
    safeCount("ffck_competitions"),
    safeCount("ffck_courses"),
    safeCount("ffck_resultats"),
  ]);

  // Courses en attente
  const { count: coursesPending } = await supabase
    .from("ffck_courses")
    .select("*", { count: "exact", head: true })
    .is("synced_at", null);

  // Liste des compétitions avec statut sync
  const { data: compsRaw } = await supabase
    .from("ffck_competitions")
    .select(`
      id, code_ffck, nom, date_debut, ville, code_niveau, nb_courses, est_national,
      ffck_courses ( synced_at )
    `)
    .order("date_debut", { ascending: false })
    .limit(200);

  const comps = ((compsRaw ?? []) as CompRow[]).map((c) => ({
    id: c.id,
    code_ffck: c.code_ffck,
    nom: c.nom,
    date_debut: c.date_debut,
    ville: c.ville,
    code_niveau: c.code_niveau,
    nb_courses: c.nb_courses,
    est_national: c.est_national,
    courses_total: c.ffck_courses.length,
    courses_synced: c.ffck_courses.filter((r) => r.synced_at !== null).length,
  }));

  return (
    <DataClient
      initialStats={{
        athletes,
        competitions,
        courses,
        resultats,
        courses_pending: coursesPending ?? 0,
      }}
      initialCompetitions={comps}
    />
  );
}
