import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createClient } from "@supabase/supabase-js";

const API_BASE = "https://api.classements-descente.plargentanck.fr";
const DEFAULT_SAISON = "202627";

type RankingEntry = {
  code_bateau: string;
  code_epreuve: string;
  points: number;
  rang: number;
  nb_courses: number;
  nom_prenom: string;
  club: string;
  numero_club: string | null;
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

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
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
  const saison: string = body.saison ?? DEFAULT_SAISON;
  const saisonAnnee = parseInt(saison.slice(0, 4), 10) || new Date().getFullYear();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const start = Date.now();

  // Pagination défensive — le classement complet tient aujourd'hui sur une
  // seule page (limit=5000) mais on continue tant qu'une page pleine revient,
  // au cas où le nombre de bateaux dépasse cette limite plus tard.
  const LIMIT = 5000;
  let offset = 0;
  const allEntries: RankingEntry[] = [];
  while (true) {
    const page = await fetchJSON<RankingEntry[]>(
      `${API_BASE}/ranking/${saison}?limit=${LIMIT}&offset=${offset}`
    );
    if (!page) {
      return NextResponse.json({ error: "API classement FFCK indisponible" }, { status: 502 });
    }
    allEntries.push(...page);
    if (page.length < LIMIT) break;
    offset += LIMIT;
  }

  const athletes = [];
  let skipped = 0;
  for (const entry of allEntries) {
    // Quelques bateaux (2 sur 1711 observés) n'ont pas de code_epreuve —
    // impossible de les rattacher à une catégorie, on les ignore.
    if (!entry.code_epreuve) { skipped++; continue; }

    const { embarcation, sexe, age_categorie } = parseCategorie(entry.code_epreuve);
    const { prenom, nom } = parseNomPrenom(entry.nom_prenom);
    athletes.push({
      code_bateau: entry.code_bateau,
      nom,
      prenom,
      club: entry.club,
      categorie: entry.code_epreuve,
      code_embarcation: embarcation,
      age_categorie,
      sexe,
      rang_national: entry.rang,
      points_classement: entry.points,
      nb_courses_classement: entry.nb_courses,
      saison: saisonAnnee,
      updated_at: new Date().toISOString(),
    });
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
    skipped,
    saison,
    duration: Date.now() - start,
  });
}
