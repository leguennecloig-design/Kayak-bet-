import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API_BASE = "https://api.classements-descente.plargentanck.fr";
const DELAY_MS = 200;
const FORCE = process.argv.includes("--force");

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
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) { if (res.status === 404) return null; throw new Error(`HTTP ${res.status}`); }
    return await res.json() as T;
  } catch (err) {
    console.error(`  ⚠ ${url}:`, (err as Error).message);
    return null;
  }
}

export async function run(limit?: number): Promise<{ resultats: number; courses: number }> {
  // Charger tous les athlètes en mémoire pour lookup rapide
  const { data: allAthletes } = await supabase.from("athletes").select("id, code_bateau");
  const athleteMap = new Map(allAthletes?.map((a) => [a.code_bateau, a.id]) ?? []);
  console.log(`   ${athleteMap.size} athlètes en cache`);

  // Récupérer les courses à synchroniser
  let query = supabase
    .from("ffck_courses")
    .select(`
      id,
      code_course,
      ffck_competitions ( code_ffck, nom )
    `)
    .order("id");

  if (!FORCE) query = query.is("synced_at", null);
  if (limit)  query = query.limit(limit);

  const { data: courses, error } = await query;
  if (error) throw new Error(error.message);
  if (!courses?.length) {
    console.log("   Toutes les courses sont synchronisées. Utilise --force pour re-sync.");
    return { resultats: 0, courses: 0 };
  }

  console.log(`   ${courses.length} courses à synchroniser${FORCE ? " (--force)" : ""}`);

  let totalResultats = 0;
  let coursesDone = 0;

  for (const course of courses) {
    const comp = course.ffck_competitions as unknown as { code_ffck: number; nom: string } | null;
    if (!comp) continue;

    const url = `${API_BASE}/competitions/${comp.code_ffck}/races/${course.code_course}`;
    const resultats = await fetchJSON<ApiResultat[]>(url);
    await sleep(DELAY_MS);

    if (!resultats?.length) {
      await supabase.from("ffck_courses").update({ synced_at: new Date().toISOString() }).eq("id", course.id);
      coursesDone++;
      continue;
    }

    const rows = resultats.map((r) => {
      const coureur1 = r.coureurs[0] ?? null;
      const coureur2 = r.coureurs[1] ?? null;
      return {
        course_id:       course.id,
        athlete_id:      athleteMap.get(r.code_bateau) ?? null,
        code_bateau:     r.code_bateau,
        rang:            r.rang ?? null,
        categorie:       r.categorie,
        temps_chrono:    r.temps_chrono ?? null,
        points:          r.points ?? null,
        dsq:             r.dsq ?? false,
        coureur1_nom:    coureur1?.nom ?? null,
        coureur1_prenom: coureur1?.prenom ?? null,
        coureur1_club:   coureur1?.club ?? null,
        coureur2_nom:    coureur2?.nom ?? null,
        coureur2_prenom: coureur2?.prenom ?? null,
        coureur2_club:   coureur2?.club ?? null,
      };
    });

    const { error: insertErr } = await supabase
      .from("ffck_resultats")
      .upsert(rows, { onConflict: "course_id,code_bateau,categorie" });

    if (insertErr) {
      console.error(`  ❌ ${comp.nom} course ${course.code_course}:`, insertErr.message);
    } else {
      totalResultats += rows.length;
      await supabase.from("ffck_courses").update({ synced_at: new Date().toISOString() }).eq("id", course.id);
    }

    coursesDone++;
    process.stdout.write(`\r   ${coursesDone}/${courses.length} courses — ${totalResultats} résultats`);
  }
  console.log();
  return { resultats: totalResultats, courses: coursesDone };
}

if (process.argv[1]?.endsWith("sync-resultats.ts")) {
  console.log("📊 Sync résultats...");
  run()
    .then(({ resultats, courses }) =>
      console.log(`✅ ${resultats} résultats (${courses} courses)`)
    )
    .catch((err) => { console.error("❌", err); process.exit(1); });
}
