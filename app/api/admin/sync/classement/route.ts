import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

type AthleteRaw = {
  rang: number;
  nom_prenom: string;
  club: string;
  code_bateau: string;
  points: number;
  nb_courses: number;
};

function parseCategorie(cat: string) {
  const embarcation = cat.substring(0, 2);
  const rest = cat.substring(2);
  const sexe = rest[0];
  const age = rest.substring(1) || null;
  return { embarcation, sexe, age_categorie: age };
}

function parseNomPrenom(nomPrenom: string) {
  const first = nomPrenom.split("/")[0].trim();
  const spaceIdx = first.indexOf(" ");
  if (spaceIdx === -1) return { nom: first, prenom: null };
  return { prenom: first.substring(0, spaceIdx), nom: first.substring(spaceIdx + 1) };
}

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const start = Date.now();
  const filePath = join(process.cwd(), "data", "classement_2026.json");
  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, AthleteRaw[]>;

  const athletes = [];
  for (const [cat, entries] of Object.entries(raw)) {
    const { embarcation, sexe, age_categorie } = parseCategorie(cat);
    for (const entry of entries) {
      const { prenom, nom } = parseNomPrenom(entry.nom_prenom);
      athletes.push({
        code_bateau: entry.code_bateau,
        nom,
        prenom,
        club: entry.club,
        categorie: cat,
        code_embarcation: embarcation,
        age_categorie,
        sexe,
        rang_national: entry.rang,
        points_classement: entry.points,
        nb_courses_classement: entry.nb_courses,
        saison: 2026,
        updated_at: new Date().toISOString(),
      });
    }
  }

  let inserted = 0;
  const BATCH = 100;
  for (let i = 0; i < athletes.length; i += BATCH) {
    const { error } = await supabase
      .from("athletes")
      .upsert(athletes.slice(i, i + BATCH), { onConflict: "code_bateau" });
    if (!error) inserted += Math.min(BATCH, athletes.length - i);
  }

  return NextResponse.json({
    success: true,
    count: inserted,
    duration: Date.now() - start,
  });
}
