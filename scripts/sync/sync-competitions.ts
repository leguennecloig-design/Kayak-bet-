import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const API_BASE = "https://api.classements-descente.plargentanck.fr";
const DELAY_MS = 200;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type ApiComp = {
  code: number;
  nom: string;
  ville?: string;
  riviere?: string;
  date_debut: string;
  date_fin?: string;
  code_niveau: string;
  code_type?: string;
  nb_courses?: number;
  nb_participants?: number;
};

type ApiRace = {
  code_course: number;
  libelle: string;
  date_course?: string;
  code_type_course?: string;
  nb_participants?: number;
  nb_categories?: number;
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

export async function run(annees = [2024, 2025, 2026], limitPerYear?: number): Promise<{ competitions: number; courses: number }> {
  let totalComps = 0;
  let totalCourses = 0;

  for (const annee of annees) {
    console.log(`\n📅 ${annee}...`);
    const data = await fetchJSON<ApiComp[]>(`${API_BASE}/competitions/years/${annee}`);
    if (!data?.length) { console.log(`   Aucune compétition`); continue; }

    const list = limitPerYear ? data.slice(0, limitPerYear) : data;
    console.log(`   ${list.length}/${data.length} compétitions`);

    for (const comp of list) {
      const { data: row, error } = await supabase
        .from("ffck_competitions")
        .upsert({
          code_ffck:       comp.code,
          nom:             comp.nom,
          ville:           comp.ville ?? null,
          riviere:         comp.riviere ?? null,
          date_debut:      comp.date_debut,
          date_fin:        comp.date_fin ?? null,
          code_niveau:     comp.code_niveau,
          code_type:       comp.code_type ?? null,
          nb_courses:      comp.nb_courses ?? 0,
          nb_participants: comp.nb_participants ?? 0,
          annee,
        }, { onConflict: "code_ffck" })
        .select("id")
        .single();

      if (error || !row) { console.error(`  ❌ ${comp.nom}:`, error?.message); continue; }
      totalComps++;
      await sleep(DELAY_MS);

      const races = await fetchJSON<ApiRace[]>(`${API_BASE}/competitions/${comp.code}/races`);
      await sleep(DELAY_MS);
      if (!races?.length) continue;

      for (const race of races) {
        const { error: raceErr } = await supabase
          .from("ffck_courses")
          .upsert({
            competition_id:   row.id,
            code_course:      race.code_course,
            libelle:          race.libelle,
            date_course:      race.date_course ?? null,
            code_type_course: race.code_type_course ?? null,
            nb_participants:  race.nb_participants ?? 0,
            nb_categories:    race.nb_categories ?? 0,
          }, { onConflict: "competition_id,code_course" });
        if (!raceErr) totalCourses++;
      }
      process.stdout.write(`\r   ${totalComps} compétitions, ${totalCourses} courses`);
    }
  }
  console.log();
  return { competitions: totalComps, courses: totalCourses };
}

if (process.argv[1]?.endsWith("sync-competitions.ts")) {
  const annees = [2024, 2025, 2026];
  console.log(`🏁 Sync compétitions ${annees.join(", ")}...`);
  run(annees)
    .then(({ competitions, courses }) =>
      console.log(`✅ ${competitions} compétitions, ${courses} courses`)
    )
    .catch((err) => { console.error("❌", err); process.exit(1); });
}
