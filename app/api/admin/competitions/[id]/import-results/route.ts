import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { parseResultatsPDF } from "@/lib/parsers/resultats-pdf";
import { parseResultatsMarkdown, looksLikeMarkdownResultats } from "@/lib/parsers/resultats-markdown";
// pdf-parse is a CommonJS module — must import with require at call site
// (already declared as serverExternalPackages in next.config)

// POST /api/admin/competitions/[id]/import-results
// Accepte multipart/form-data avec un fichier de résultats : PDF/TXT export
// brut compétFFCK, ou Markdown (tableaux par catégorie + listes Abs/Abd/Dsq,
// voir lib/parsers/resultats-markdown.ts) — détecté automatiquement.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  let rawText = "";

  const fileName = file.name.toLowerCase();
  if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
    rawText = new TextDecoder("utf-8").decode(buffer);
  } else {
    // PDF — utiliser pdf-parse
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const pdfData = await pdfParse(buffer);
      rawText = pdfData.text as string;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Erreur lecture PDF : ${msg}` },
        { status: 422 }
      );
    }
  }

  if (!rawText.trim()) {
    return NextResponse.json({ error: "Le fichier ne contient aucun texte" }, { status: 422 });
  }

  // Parser — deux formats possibles : tableaux Markdown "nettoyés" (si .md,
  // ou si le contenu ressemble à un tableau Markdown quelle que soit
  // l'extension) ou export texte brut compétFFCK (PDF/TXT).
  const parsed = fileName.endsWith(".md") || looksLikeMarkdownResultats(rawText)
    ? parseResultatsMarkdown(rawText)
    : parseResultatsPDF(rawText);

  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "Aucun résultat détecté dans le fichier. Vérifie le format (compétFFCK v6, ou tableaux Markdown par catégorie)." },
      { status: 422 }
    );
  }

  const supabase = createAdminSupabase();

  // Supprimer les anciens résultats de cette compétition
  await supabase.from("resultats").delete().eq("competition_id", params.id);

  // Insérer les nouveaux
  const toInsert = parsed.map(r => ({
    competition_id: params.id,
    categorie:      r.categorie,
    rang:           r.rang   ?? null,
    dossard:        r.dossard ?? null,
    nom:            r.nom,
    club:           r.club   ?? null,
    temps:          r.temps  ?? null,
    points:         r.points ?? null,
    dns:            r.dns,
    dnf:            r.dnf,
    dsq:            r.dsq,
  }));

  const CHUNK = 200;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK);
    const { error } = await supabase.from("resultats").insert(chunk);
    if (error) {
      return NextResponse.json(
        { error: `Erreur insertion (ligne ${i}): ${error.message}` },
        { status: 500 }
      );
    }
    inserted += chunk.length;
  }

  // Résumé par catégorie
  const byCategorie: Record<string, number> = {};
  for (const r of parsed) {
    byCategorie[r.categorie] = (byCategorie[r.categorie] ?? 0) + 1;
  }

  return NextResponse.json({
    ok:        true,
    total:     inserted,
    categories: byCategorie,
  });
}
