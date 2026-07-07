export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { frDateToISO } from "@/lib/startlist/parse";
import {
  calculateCotesFromStartlist,
  saveCotes,
  saveCotesForCompetition,
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
  type_competition?: string | null;
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
  // Matché par nom + date (comme ffck_competitions plus haut) — un match par
  // nom seul faisait réutiliser une compétition existante sans rapport dès
  // qu'une autre compétition portait le même nom à une date différente
  // (ex : édition précédente du même événement).
  let bettingCompId: string | null = null;
  const bettingBaseQ = supabase
    .from("competitions")
    .select("id")
    .eq("nom", body.nom_competition);
  const { data: existingBetting } = await (dateDebut
    ? bettingBaseQ.eq("date", dateDebut)
    : bettingBaseQ.is("date", null)
  ).maybeSingle();

  if (existingBetting?.id) {
    bettingCompId = existingBetting.id;
  } else {
    const { data: newBetting, error: bettingErr } = await supabase
      .from("competitions")
      .insert({
        nom: body.nom_competition,
        date: dateDebut,
        lieu: body.lieu,
        discipline: null,
        type_competition: body.type_competition ?? null,
      })
      .select("id")
      .single();
    if (bettingErr || !newBetting) {
      // Les données FFCK (ffck_competitions/ffck_courses/startlist_entries)
      // sont déjà enregistrées à ce stade — un ré-import est sûr (idempotent
      // par nom+date) et reprendra directement à cette étape.
      return NextResponse.json(
        {
          error: `Compétition de paris non créée : ${bettingErr?.message ?? "erreur inconnue"}. ` +
            "Les données FFCK ont bien été importées — réessaie l'import, il reprendra ici sans dupliquer le reste.",
        },
        { status: 500 }
      );
    }
    bettingCompId = newBetting.id;
  }

  // Index code_bateau → club par catégorie, pour enrichir les participants.
  // Clé par code_bateau (pas par nom) : `CoteResult.nom` est déjà "NOM Prénom"
  // complet (construit par calculateCotesFromStartlist), donc chercher par
  // nom de famille seul ne matchait jamais — le club n'était donc jamais
  // retrouvé. code_bateau est fiable et présent des deux côtés.
  const catClubLookup = new Map<string, Map<string, string>>();
  for (const cat of body.categories) {
    const m = new Map<string, string>();
    for (const ath of cat.athletes) {
      const key = ath.code_bateau ?? `${cat.code}-${ath.dossard}`;
      m.set(key, ath.club);
    }
    catClubLookup.set(cat.code, m);
  }

  // 5. Calculer les cotes pour toutes les catégories (mono + C2 biplace)
  // Sauvegardées sous les deux clés : course_id (pour /admin/cotes, système
  // FFCK officiel) ET competition_id (pour l'app publique — CategoryBetModal
  // lit /api/competitions/[id]/cotes par competition_id, pas par course_id).
  // Sans ce deuxième saveCotesForCompetition, seul le pari "Vainqueur" (cote
  // brute sur participants.cote) était disponible : aucune cote avancée
  // (Top3/5/10/20, place exacte, temps exact) n'était jamais trouvée pour
  // une compétition importée par ce flux PDF.
  const cotesResults: Record<string, number> = {};
  type ParticipantRow = {
    competition_id: string;
    nom: string;
    pays: string | null;
    cote: number;
    categorie: string;
    code_bateau: string | null;
  };
  const allParticipants: ParticipantRow[] = [];

  for (const cat of body.categories.map((c) => c.code)) {
    let cotes: Awaited<ReturnType<typeof calculateCotesFromStartlist>> = [];
    try {
      cotes = await calculateCotesFromStartlist(courseId, cat, supabase);
    } catch (e) {
      console.error(`[import-startlist] calcul cotes ${cat}:`, e);
      continue;
    }
    if (cotes.length === 0) continue;

    // Chaque sauvegarde est indépendante : un échec de l'une (ex: le système
    // course_id, réservé à l'admin FFCK) ne doit jamais empêcher l'autre ni
    // la création des participants, qui est ce qui compte réellement pour
    // que la compétition soit pariable côté utilisateur.
    try {
      await saveCotes(courseId, cotes, supabase);
    } catch (e) {
      console.error(`[import-startlist] saveCotes (course_id) ${cat}:`, e);
    }
    if (bettingCompId) {
      try {
        await saveCotesForCompetition(bettingCompId, cotes, supabase);
      } catch (e) {
        console.error(`[import-startlist] saveCotesForCompetition ${cat}:`, e);
      }
    }

    cotesResults[cat] = cotes.length;
    if (bettingCompId) {
      for (const c of cotes) {
        allParticipants.push({
          competition_id: bettingCompId,
          nom: c.nom,
          pays: catClubLookup.get(cat)?.get(c.code_bateau) ?? null,
          cote: c.cote_top1,
          categorie: cat,
          code_bateau: c.code_bateau,
        });
      }
    }
  }

  // 6. Insérer tous les participants (1 par athlète, triés par catégorie puis cote)
  let participantsWarning: string | undefined;
  if (bettingCompId && allParticipants.length > 0) {
    await supabase.from("participants").delete().eq("competition_id", bettingCompId);
    allParticipants.sort((a, b) =>
      a.categorie.localeCompare(b.categorie) || a.cote - b.cote
    );
    const { error: participantsErr } = await supabase.from("participants").insert(allParticipants);
    if (participantsErr) {
      console.error("[import-startlist] participants:", participantsErr);
      participantsWarning = `Compétition créée mais les participants n'ont pas pu être enregistrés : ${participantsErr.message}. Relance le calcul des cotes depuis la page de la compétition.`;
    }
  }

  return NextResponse.json({
    ok: true,
    competition_id: compId,
    betting_competition_id: bettingCompId,
    course_id: courseId,
    ...(participantsWarning ? { warning: participantsWarning } : {}),
    entries: entries.length,
    cotes: cotesResults,
    participants_added: allParticipants.length,
  });
}
