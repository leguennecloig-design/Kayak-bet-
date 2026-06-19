import { adminGuard } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import CompetitionDetail from "./CompetitionDetail";

export default async function CompetitionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await adminGuard();

  const supabase = createAdminSupabase();

  const { data: comp, error } = await supabase
    .from("ffck_competitions")
    .select(`
      id, code_ffck, nom, ville, riviere, date_debut, code_niveau, code_type, est_national,
      ffck_courses (
        id, code_course, libelle, nb_participants, synced_at,
        ffck_resultats (
          id, rang, code_bateau, categorie, temps_secondes, points, dsq,
          coureur1_nom, coureur1_prenom, coureur1_club,
          coureur2_nom, coureur2_prenom
        )
      )
    `)
    .eq("id", params.id)
    .order("code_course", { referencedTable: "ffck_courses" })
    .single();

  if (error || !comp) notFound();

  // Ordonner les résultats par rang dans chaque course
  const competition = {
    ...comp,
    courses: (comp.ffck_courses ?? []).map((course) => ({
      ...course,
      resultats: (course.ffck_resultats ?? []).sort((a, b) => {
        if (a.dsq && !b.dsq) return 1;
        if (!a.dsq && b.dsq) return -1;
        return (a.rang ?? 999) - (b.rang ?? 999);
      }),
    })),
  };

  return <CompetitionDetail competition={competition as Parameters<typeof CompetitionDetail>[0]["competition"]} />;
}
