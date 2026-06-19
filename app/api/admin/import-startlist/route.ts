export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { frDateToISO } from "@/lib/startlist/parse";
import {
  calculateCotesFromStartlist,
  saveCotes,
} from "@/lib/algo/cotes-engine";

type ImportedAthlete = {
  dossard: number;
  nom: string;
  prenom: string;
  club: string;
  depart: string;
  categorie?: string;
  athlete_id: string | null;
  code_bateau: string | null;
  matched: boolean;
  isBiplace: boolean;
};

type ImportedCategory = {
  code: string;
  libelle: string;
  isBiplace: boolean;
  athletes: ImportedAthlete[];
};

type ImportBody = {
  nom_competition: string;
  lieu: string;
  date_debut: string | null;
  date_fin: string | null;
  type_epreuve: string;
  categories: ImportedCategory[];
};

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = (await req.json()) as ImportBody;
  const supabase = createAdminSupabase();

  const dateDebut = body.date_debut ? frDateToISO(body.date_debut) : null;
  const dateFin = body.date_fin ? frDateToISO(body.date_fin) : null;
  const annee = dateDebut ? parseInt(dateDebut.slice(0, 4)) : new Date().getFullYear();

  // 1. Créer ou récupérer la compétition
  let compId: string;
  const { data: existing } = await supabase
    .from("ffck_competitions")
    .select("id")
    .eq("nom", body.nom_competition)
    .eq("date_debut", dateDebut ?? "")
    .maybeSingle();

  if (existing?.id) {
    compId = existing.id;
  } else {
    const { data: comp, error: compErr } = await supabase
      .from("ffck_competitions")
      .insert({
        nom: body.nom_competition,
        ville: body.lieu,
        date_debut: dateDebut,
        date_fin: dateFin,
        annee,
        code_niveau: "NAT",
        code_type: "SEL",
        nb_courses: 1,
        nb_participants: body.categories.reduce(
          (s, c) => s + c.athletes.length,
          0
        ),
      })
      .select("id")
      .single();
    if (compErr || !comp) {
      return NextResponse.json(
        { error: compErr?.message ?? "Erreur création compétition" },
        { status: 500 }
      );
    }
    compId = comp.id;
  }

  // 2. Créer ou récupérer la course "Classique"
  let courseId: string;
  const { data: existingCourse } = await supabase
    .from("ffck_courses")
    .select("id")
    .eq("competition_id", compId)
    .eq("libelle", body.type_epreuve)
    .maybeSingle();

  if (existingCourse?.id) {
    courseId = existingCourse.id;
  } else {
    const totalParticipants = body.categories.reduce(
      (s, c) => s + c.athletes.length,
      0
    );
    const { data: course, error: courseErr } = await supabase
      .from("ffck_courses")
      .insert({
        competition_id: compId,
        code_course: 1,
        libelle: body.type_epreuve,
        nb_participants: totalParticipants,
        synced_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (courseErr || !course) {
      return NextResponse.json(
        { error: courseErr?.message ?? "Erreur création course" },
        { status: 500 }
      );
    }
    courseId = course.id;
  }

  // 3. Insérer startlist_entries (upsert pour éviter les doublons)
  const entries = body.categories.flatMap((cat) =>
    cat.athletes.map((ath) => ({
      course_id: courseId,
      athlete_id: ath.athlete_id ?? null,
      code_bateau: ath.code_bateau ?? null,
      nom: ath.nom,
      prenom: ath.prenom ?? "",
      club: ath.club,
      categorie: cat.code,
      dossard: ath.dossard,
      depart: ath.depart,
      matched: ath.matched,
      is_biplace: cat.isBiplace,
    }))
  );

  if (entries.length > 0) {
    const { error: entryErr } = await supabase
      .from("startlist_entries")
      .upsert(entries, { onConflict: "course_id,dossard,nom" });
    if (entryErr) {
      return NextResponse.json({ error: entryErr.message }, { status: 500 });
    }
  }

  // 4. Calculer les cotes pour les monoplaces
  const monoCategories = body.categories
    .filter((c) => !c.isBiplace)
    .map((c) => c.code);

  const cotesResults: Record<string, number> = {};
  for (const cat of monoCategories) {
    const cotes = await calculateCotesFromStartlist(courseId, cat, supabase);
    if (cotes.length > 0) {
      await saveCotes(courseId, cotes, supabase);
      cotesResults[cat] = cotes.length;
    }
  }

  return NextResponse.json({
    ok: true,
    competition_id: compId,
    course_id: courseId,
    entries: entries.length,
    cotes: cotesResults,
  });
}
