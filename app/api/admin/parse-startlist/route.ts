export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { parseStartlistText, normalizeName } from "@/lib/startlist/parse";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }

  // Parse PDF
  const buffer = Buffer.from(await file.arrayBuffer());
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (b: Buffer) => Promise<{ text: string }>;
  const { text } = await pdfParse(buffer);

  const startlist = parseStartlistText(text);

  // Charger tous les athlètes pour le matching
  const supabase = createAdminSupabase();
  const { data: athletes } = await supabase
    .from("athletes")
    .select("id, code_bateau, nom, prenom, categorie, rang_national, points_classement");

  // Index par nom normalisé → liste d'athlètes (un nom peut exister en plusieurs catégories)
  const nameIndex = new Map<string, typeof athletes>();
  for (const a of athletes ?? []) {
    const key = normalizeName(`${a.nom} ${a.prenom}`);
    if (!nameIndex.has(key)) nameIndex.set(key, []);
    nameIndex.get(key)!.push(a);
  }

  // Enrichir chaque athlète avec les infos de matching
  const enriched = startlist.categories.map((cat) => ({
    ...cat,
    athletes: cat.athletes.map((ath) => {
      const key = normalizeName(`${ath.nom} ${ath.prenom}`);
      const candidates = nameIndex.get(key) ?? [];
      // Priorité : même catégorie, sinon premier trouvé
      const match =
        candidates.find((c) => c.categorie === cat.code) ??
        candidates[0] ??
        null;
      return {
        ...ath,
        athlete_id: match?.id ?? null,
        code_bateau: match?.code_bateau ?? null,
        rang_national: match?.rang_national ?? null,
        matched: !!match,
      };
    }),
  }));

  const totalAthletes = enriched.reduce((s, c) => s + c.athletes.length, 0);
  const matched = enriched.reduce(
    (s, c) => s + c.athletes.filter((a) => a.matched).length,
    0
  );

  return NextResponse.json({
    ...startlist,
    categories: enriched,
    stats: { total: totalAthletes, matched, unmatched: totalAthletes - matched },
  });
}
