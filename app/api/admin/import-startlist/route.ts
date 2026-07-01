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

  let body: ImportBody;
  try {
    body = (await req.json()) as ImportBody;
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const supabase = createAdminSupabase();

  const dateDebut = body.date_debut ? frDateToISO(body.date_debut) : null;
  const dateFin   = body.date_fin   ? frDateToISO(body.date_fin)   : null;
  const annee = dateDebut ? parseInt(dateDebut.slice(0, 4)) : new Date().getFullYear();

  // 1. Créer ou récupérer la compétition (idempotence correcte même si date est null)
  let compId: string;
  const baseQ = supabase
    .from("ffck_competitions")
    .select("id")
    .eq("nom", body.nom_competition);
  const { data: existing } = await (dateDebut
    ? baseQ.eq("date_debut", dateDebut)
    : baseQ.is("date_debut", null)
  ).maybeSingle();

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

  // 2. Créer ou récupérer la course
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
    const { data: course, error: courseErr } = await supabase
      .from("ffck_courses")
      .insert({
        competition_id: compId,
        code_course: 1,
        libelle: body.type_epreuve,
        nb_participants: body.categories.reduce((s, c) => s + c.athletes.length, 0),
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

  // 3. Insérer startlist_entries — delete+insert pour éviter les conflits
  // (upsert impossible : deux rameurs d'un C2 peuvent avoir le même nom de famille)
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
    // Supprimer les entrées existantes pour cette course avant de réinsérer
    await supabase.from("startlist_entries").delete().eq("course_id", courseId);

    // Dédupliquer par (categorie, dossard, nom, prenom) — évite les doublons
    // dans la batch insert même si la contrainte DB n'est pas encore mise à jour
    const seen = new Set<string>();
    const dedupedEntries = entries.filter(e => {
      const key = `${e.categorie}|${e.dossard}|${e.nom}|${e.prenom}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const { error: entryErr } = await supabase
      .from("startlist_entries")
      .insert(dedupedEntries);
    if (entryErr) {
      return NextResponse.json({ error: entryErr.message }, { status: 500 });
    }
  }

  // 4. Créer (ou retrouver) une entrée dans la table "competitions" (paris)
  // pour que la compétition apparaisse dans le panneau admin.
  let bettingCompId: string | null = null;
  const { data: existingBetting } = await supabase
    .from("competitions")
    .select("id")
    .eq("nom", body.nom_competition)
    .maybeSingle();

  if (existingBetting?.id) {
    bettingCompId = existingBetting.id;
  } else {
    const { data: newBetting } = await supabase
      .from("competitions")
      .insert({
        nom: body.nom_competition,
        date: dateDebut,
        lieu: body.lieu,
        discipline: null,
      })
      .select("id")
      .single();
    bettingCompId = newBetting?.id ?? null;
  }

  // Index nom → {prenom, club} par catégorie pour enrichir les participants
  const catNomLookup = new Map<string, Map<string, { prenom: string; club: string }>>();
  for (const cat of body.categories) {
    const m = new Map<string, { prenom: string; club: string }>();
    for (const ath of cat.athletes) m.set(ath.nom, { prenom: ath.prenom, club: ath.club });
    catNomLookup.set(cat.code, m);
  }

  // 5. Calculer les cotes pour toutes les catégories (mono + C2 biplace)
  const cotesResults: Record<string, number> = {};
  const favorites: Array<{ nom: string; prenom: string; club: string; cote_top1: number; categorie: string }> = [];

  for (const cat of body.categories.map((c) => c.code)) {
    try {
      const cotes = await calculateCotesFromStartlist(courseId, cat, supabase);
      if (cotes.length > 0) {
        await saveCotes(courseId, cotes, supabase);
        cotesResults[cat] = cotes.length;
        const fav = cotes.reduce((best, c) => c.cote_top1 < best.cote_top1 ? c : best);
        const info = catNomLookup.get(cat)?.get(fav.nom);
        favorites.push({
          nom: fav.nom,
          prenom: info?.prenom ?? "",
          club: info?.club ?? "",
          cote_top1: fav.cote_top1,
          categorie: cat,
        });
      }
    } catch (e) {
      console.error(`[import-startlist] cotes ${cat}:`, e);
    }
  }

  // 6. Auto-importer le favori de chaque catégorie comme participant
  if (bettingCompId && favorites.length > 0) {
    await supabase.from("participants").delete().eq("competition_id", bettingCompId);
    await supabase.from("participants").insert(
      favorites.map((f) => ({
        competition_id: bettingCompId,
        nom: [f.prenom, f.nom].filter(Boolean).join(" ").trim(),
        pays: f.categorie,
        cote: f.cote_top1,
      }))
    );
  }

  return NextResponse.json({
    ok: true,
    competition_id: compId,
    betting_competition_id: bettingCompId,
    course_id: courseId,
    entries: entries.length,
    cotes: cotesResults,
    participants_added: favorites.length,
  });
}
