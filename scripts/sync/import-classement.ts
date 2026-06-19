import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type AthleteRaw = {
  rang: number;
  nom_prenom: string;
  club: string;
  code_bateau: string;
  points: number;
  nb_courses: number;
};

function parseCategorie(cat: string) {
  // K1HU15 → embarcation=K1, sexe=H, age=U15
  // C1D    → embarcation=C1, sexe=D, age=null
  // C2MU15 → embarcation=C2, sexe=M, age=U15
  const embarcation = cat.substring(0, 2);
  const rest = cat.substring(2);
  const sexe = rest[0];
  const age = rest.substring(1) || null;
  return { embarcation, sexe, age_categorie: age };
}

function parseNomPrenom(nomPrenom: string) {
  // "Benjamin BUSQUET" ou "Loig LE GUENNEC/Nolann FIDON" (C2)
  const first = nomPrenom.split("/")[0].trim();
  const spaceIdx = first.indexOf(" ");
  if (spaceIdx === -1) return { nom: first, prenom: null };
  return { prenom: first.substring(0, spaceIdx), nom: first.substring(spaceIdx + 1) };
}

export async function run(): Promise<{ count: number }> {
  const filePath = join(process.cwd(), "data", "classement_2026.json");
  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, AthleteRaw[]>;

  const athletes = [];
  for (const [cat, entries] of Object.entries(raw)) {
    const { embarcation, sexe, age_categorie } = parseCategorie(cat);
    for (const entry of entries) {
      const { prenom, nom } = parseNomPrenom(entry.nom_prenom);
      athletes.push({
        code_bateau:           entry.code_bateau,
        nom,
        prenom,
        club:                  entry.club,
        categorie:             cat,
        code_embarcation:      embarcation,
        age_categorie,
        sexe,
        rang_national:         entry.rang,
        points_classement:     entry.points,
        nb_courses_classement: entry.nb_courses,
        saison:                2026,
        updated_at:            new Date().toISOString(),
      });
    }
  }

  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < athletes.length; i += BATCH) {
    const { error } = await supabase
      .from("athletes")
      .upsert(athletes.slice(i, i + BATCH), { onConflict: "code_bateau" });
    if (error) console.error(`  ❌ Batch ${i}:`, error.message);
    else inserted += Math.min(BATCH, athletes.length - i);
    process.stdout.write(`\r   ${inserted}/${athletes.length}`);
  }
  console.log();
  return { count: inserted };
}

if (process.argv[1]?.endsWith("import-classement.ts")) {
  console.log("📥 Import classement numérique 2026...");
  run()
    .then(({ count }) => console.log(`✅ ${count} athlètes importés`))
    .catch((err) => { console.error("❌", err); process.exit(1); });
}
