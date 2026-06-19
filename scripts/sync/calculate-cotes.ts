import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import {
  calculateCotesForCourse,
  saveCotes,
} from "../../lib/algo/cotes-engine";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const args = process.argv.slice(2);
  const courseIdFlag = args.find((a) => a.startsWith("--courseId="));
  const yearFlag    = args.find((a) => a.startsWith("--year="));

  const courseId = courseIdFlag?.split("=")[1];
  const year     = yearFlag    ? parseInt(yearFlag.split("=")[1]) : null;

  if (courseId) {
    await processCourse(courseId);
    return;
  }

  // Récupère toutes les courses (filtre par année si fournie)
  let query = supabase
    .from("ffck_courses")
    .select(`
      id, code_course,
      ffck_competitions ( id, nom, annee, date_debut )
    `);

  if (year) {
    query = query.eq("ffck_competitions.annee", year);
  }

  const { data: courses, error } = await query;

  if (error) {
    console.error("Erreur chargement courses:", error.message);
    process.exit(1);
  }

  const filtered = (courses ?? []).filter((c) => {
    const comp = Array.isArray(c.ffck_competitions)
      ? c.ffck_competitions[0]
      : c.ffck_competitions;
    if (!comp) return false;
    if (year && (comp as { annee?: number }).annee !== year) return false;
    return true;
  });

  console.log(`\n🎯 ${filtered.length} manche(s) à traiter${year ? ` (année ${year})` : ""}\n`);

  for (const course of filtered) {
    await processCourse(course.id as string, course.code_course as string);
  }

  console.log("\n✅ Terminé.\n");
}

async function processCourse(courseId: string, label = courseId) {
  console.log(`\n📊 Course ${label} (${courseId})`);

  const { data: cats } = await supabase
    .from("ffck_resultats")
    .select("categorie")
    .eq("course_id", courseId)
    .eq("dsq", false)
    .not("rang", "is", null);

  const categories = [...new Set((cats ?? []).map((r: { categorie: string }) => r.categorie))];

  if (categories.length === 0) {
    console.log("  Aucun résultat classé — ignorée");
    return;
  }

  let total = 0;
  for (const cat of categories) {
    const cotes = await calculateCotesForCourse(courseId, cat, supabase);
    if (cotes.length === 0) {
      console.log(`  ${cat}: pas de données classement — ignorée`);
      continue;
    }
    await saveCotes(courseId, cotes, supabase);
    const best = cotes.sort((a, b) => a.rang_espere - b.rang_espere)[0];
    console.log(
      `  ${cat}: ${cotes.length} cotes — favori ${best.nom} (cote top1: ${best.cote_top1?.toFixed(2)})`
    );
    total += cotes.length;
  }

  console.log(`  → ${total} cotes sauvegardées`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
