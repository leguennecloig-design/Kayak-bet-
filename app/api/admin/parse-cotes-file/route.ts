import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { parseExternalCotesFile } from "@/lib/algo/external-cotes-parser";

// POST /api/admin/parse-cotes-file — parse un fichier .txt de cotes déjà
// calculées en externe (format "KAYAKBET — COTES V4"), sans rien créer en
// base. Le résultat est prévisualisé et corrigé côté admin avant l'import
// réel (POST /api/admin/import-cotes-file).
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".txt")) {
    return NextResponse.json({ error: "Format non supporté — utilise un fichier .txt" }, { status: 400 });
  }

  const content = await file.text();
  const parsed = parseExternalCotesFile(content);

  if (parsed.categories.length === 0) {
    return NextResponse.json(
      { error: "Aucune catégorie/athlète reconnu dans ce fichier. Vérifie le format (sections \"<Libellé> (<CODE>) – N partant(s)\" suivies d'un tableau Dos/Nom/Club/T1/T3/T5/T10)." },
      { status: 422 }
    );
  }

  return NextResponse.json(parsed);
}
