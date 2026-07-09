export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { parseStartlistText, normalizeName } from "@/lib/startlist/parse";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  let text: string;

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    // Fichier texte — lecture directe, pas de pdf-parse requis
    text = await file.text();
  } else if (name.endsWith(".pdf")) {
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (b: Buffer) => Promise<{ text: string }>;
      const result = await pdfParse(buffer);
      text = result.text;
    } catch (e) {
      console.error("[parse-startlist] pdfParse error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `Erreur lecture PDF : ${msg}` }, { status: 400 });
    }
  } else {
    return NextResponse.json(
      { error: "Format non supporté — utilisez .pdf ou .txt" },
      { status: 400 }
    );
  }

  const startlist = parseStartlistText(text);

  // Charger tous les athlètes en paginant par tranches de 1000
  const supabase = createAdminSupabase();
  type AthRow = { id: string; code_bateau: string | null; nom: string; prenom: string; categorie: string; rang_national: number | null; points_classement: number | null };
  const PAGE = 1000;
  const athletes: AthRow[] = [];
  let offset = 0;
  while (true) {
    const { data, error: athErr } = await supabase
      .from("athletes")
      .select("id, code_bateau, nom, prenom, categorie, rang_national, points_classement")
      .range(offset, offset + PAGE - 1);
    if (athErr) {
      return NextResponse.json({ error: `Erreur chargement athlètes: ${athErr.message}` }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    athletes.push(...(data as AthRow[]));
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  // Index par nom normalisé → liste d'athlètes (un nom peut exister en plusieurs catégories)
  const nameIndex = new Map<string, AthRow[]>();
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
