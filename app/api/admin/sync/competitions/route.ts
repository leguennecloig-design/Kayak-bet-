import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createClient } from "@supabase/supabase-js";

const API_BASE = "https://api.classements-descente.plargentanck.fr";

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
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const annee: number = body.annee ?? new Date().getFullYear();
  const limit: number = body.limit ?? 25;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const start = Date.now();
  const data = await fetchJSON<ApiComp[]>(`${API_BASE}/competitions/years/${annee}`);
  if (!data) return NextResponse.json({ error: "API FFCK indisponible" }, { status: 502 });

  const list = data.slice(0, limit);
  let totalComps = 0;
  let totalCourses = 0;

  for (const comp of list) {
    const { data: row, error } = await supabase
      .from("ffck_competitions")
      .upsert({
        code_ffck: comp.code,
        nom: comp.nom,
        ville: comp.ville ?? null,
        riviere: comp.riviere ?? null,
        date_debut: comp.date_debut,
        date_fin: comp.date_fin ?? null,
        code_niveau: comp.code_niveau,
        code_type: comp.code_type ?? null,
        nb_courses: comp.nb_courses ?? 0,
        nb_participants: comp.nb_participants ?? 0,
        annee,
      }, { onConflict: "code_ffck" })
      .select("id")
      .single();

    if (error || !row) continue;
    totalComps++;
    await sleep(150);

    const races = await fetchJSON<ApiRace[]>(`${API_BASE}/competitions/${comp.code}/races`);
    await sleep(150);
    if (!races?.length) continue;

    for (const race of races) {
      const { error: raceErr } = await supabase
        .from("ffck_courses")
        .upsert({
          competition_id: row.id,
          code_course: race.code_course,
          libelle: race.libelle,
          date_course: race.date_course ?? null,
          code_type_course: race.code_type_course ?? null,
          nb_participants: race.nb_participants ?? 0,
          nb_categories: race.nb_categories ?? 0,
        }, { onConflict: "competition_id,code_course" });
      if (!raceErr) totalCourses++;
    }
  }

  return NextResponse.json({
    success: true,
    annee,
    total_disponibles: data.length,
    synced_competitions: totalComps,
    synced_courses: totalCourses,
    duration: Date.now() - start,
  });
}
