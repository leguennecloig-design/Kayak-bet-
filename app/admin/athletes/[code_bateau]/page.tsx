import { adminGuard } from "@/lib/auth/admin-guard";
import { findAthleteByCodeBateau, CATEGORY_LABELS } from "@/lib/athletes";
import { createAdminSupabase } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import AthleteDetail from "./AthleteDetail";

export default async function AthletePage({
  params,
}: {
  params: { code_bateau: string };
}) {
  await adminGuard();

  const code = decodeURIComponent(params.code_bateau);

  // Trouver l'athlète en direct dans Supabase (jamais un snapshot figé).
  const found = await findAthleteByCodeBateau(code);

  if (!found) notFound();

  const { athlete, categorie } = found;

  const supabase = createAdminSupabase();

  const { data: raw } = await supabase
    .from("ffck_resultats")
    .select(`
      id, rang, categorie, temps_secondes, points, dsq,
      ffck_courses (
        id, libelle, code_course,
        ffck_competitions (
          id, nom, date_debut, code_niveau, ville
        )
      )
    `)
    .eq("code_bateau", code);

  type RawComp = {
    id: string; nom: string; date_debut: string;
    code_niveau: string; ville: string | null;
  };
  type RawCourse = {
    id: string; libelle: string; code_course: number;
    ffck_competitions: RawComp | RawComp[] | null;
  };

  // Normaliser les nested joins (Supabase peut renvoyer objet ou tableau)
  const resultats = (raw ?? []).map((r) => {
    const rawCourse = r.ffck_courses as unknown as RawCourse | RawCourse[] | null;
    const course = Array.isArray(rawCourse) ? rawCourse[0] ?? null : rawCourse;
    if (!course) return null;

    const rawComp = course.ffck_competitions;
    const competition = Array.isArray(rawComp) ? rawComp[0] ?? null : rawComp;
    if (!competition) return null;

    return {
      id: r.id as string,
      rang: r.rang as number | null,
      categorie: r.categorie as string,
      temps_secondes: r.temps_secondes as number | null,
      points: r.points as number | null,
      dsq: r.dsq as boolean | null,
      course: {
        id: course.id,
        libelle: course.libelle,
        competition,
      },
    };
  }).filter(Boolean) as NonNullable<ReturnType<typeof Array.prototype.filter>>[number][];

  return (
    <AthleteDetail
      athlete={{
        rang: athlete.rang,
        nom_prenom: athlete.nom_prenom,
        club: athlete.club,
        code_bateau: athlete.code_bateau,
        points: athlete.points,
        nb_courses: athlete.nb_courses,
        categorie,
        label: CATEGORY_LABELS[categorie] ?? categorie,
      }}
      resultats={resultats as Parameters<typeof AthleteDetail>[0]["resultats"]}
    />
  );
}
