import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import {
  calculateCotesForCourse,
  calculateCotesFromStartlist,
  saveCotes,
} from "../../lib/algo/cotes-engine";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isSprintCourse(libelle: string): boolean {
  return libelle.toLowerCase().includes('sprint');
}

async function main() {
  const args = process.argv.slice(2);
  const courseIdFlag = args.find(a => a.startsWith("--courseId="));
  const yearFlag     = args.find(a => a.startsWith("--year="));
  const forceFlag    = args.includes("--force");

  const singleCourseId = courseIdFlag?.split("=")[1];
  const year           = yearFlag ? parseInt(yearFlag.split("=")[1]) : null;

  if (singleCourseId) {
    await processCourse(singleCourseId, singleCourseId);
    return;
  }

  let query = supabase
    .from("ffck_courses")
    .select("id, libelle, ffck_competitions(id, nom, annee, code_type)");

  const { data: courses, error } = await query;

  if (error) {
    console.error("Erreur chargement courses:", error.message);
    process.exit(1);
  }

  const filtered = (courses ?? []).filter(c => {
    const comp = Array.isArray(c.ffck_competitions)
      ? c.ffck_competitions[0]
      : c.ffck_competitions;
    if (!comp) return false;
    if (year && (comp as { annee?: number }).annee !== year) return false;
    if ((comp as { code_type?: string }).code_type === 'SEL' && !forceFlag) return false;
    return true;
  });

  console.log(`\n🎯 ${filtered.length} manche(s) à traiter${year ? ` (année ${year})` : ""}\n`);

  let totalCotes = 0;

  for (const course of filtered) {
    const comp = Array.isArray(course.ffck_competitions)
      ? course.ffck_competitions[0]
      : course.ffck_competitions;
    const compNom = (comp as { nom?: string })?.nom ?? '—';
    const libelle = course.libelle ?? course.id;
    const discipline = isSprintCourse(libelle) ? 'SPRINT' : 'CLASSIQUE';

    const n = await processCourse(course.id as string, `${compNom} — ${libelle} [${discipline}]`);
    totalCotes += n;
  }

  console.log(`\n✅ Total : ${totalCotes} cotes calculées\n`);
}

async function processCourse(courseId: string, label = courseId): Promise<number> {
  // Détecte le type de source : startlist importée (SEL) ou résultats FFCK
  const { count: startlistCount } = await supabase
    .from("startlist_entries")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);

  const useStartlist = (startlistCount ?? 0) > 0;

  let categories: string[];
  if (useStartlist) {
    const { data: cats } = await supabase
      .from("startlist_entries")
      .select("categorie")
      .eq("course_id", courseId)
      .eq("is_biplace", false);
    categories = [...new Set((cats ?? []).map((r: { categorie: string }) => r.categorie))];
  } else {
    const { data: cats } = await supabase
      .from("ffck_resultats")
      .select("categorie")
      .eq("course_id", courseId)
      .eq("dsq", false)
      .not("rang", "is", null);
    categories = [...new Set((cats ?? []).map((r: { categorie: string }) => r.categorie))];
  }

  if (categories.length === 0) {
    console.log(`  ${label} — aucun résultat classé`);
    return 0;
  }

  let total = 0;
  for (const cat of categories) {
    const cotes = useStartlist
      ? await calculateCotesFromStartlist(courseId, cat, supabase)
      : await calculateCotesForCourse(courseId, cat, supabase);
    if (cotes.length === 0) continue;
    await saveCotes(courseId, cotes, supabase);
    const best = [...cotes].sort((a, b) => a.rang_espere - b.rang_espere)[0];
    const fbBadge = best.fallback_type !== 'discipline' ? ` [${best.fallback_type}]` : '';
    const src = useStartlist ? 'startlist' : 'resultats';
    console.log(
      `  ✓ ${label} — ${cat} : ${cotes.length} cotes (v2.0/${src}) — favori ${best.nom}${fbBadge} top1=${best.cote_top1}`
    );
    total += cotes.length;
  }

  return total;
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
