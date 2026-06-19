import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { classement } from "@/lib/athletes";

export type AthleteResult = {
  rang: number;
  nom_prenom: string;
  club: string;
  code_bateau: string;
  points: number;
  nb_courses: number;
  categorie: string;
};

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase().trim() ?? "";
  const cat = searchParams.get("cat") ?? "";

  if (!q && !cat) {
    return NextResponse.json([]);
  }

  const results: AthleteResult[] = [];
  const catsToSearch = cat ? [cat] : Object.keys(classement);

  for (const c of catsToSearch) {
    const athletes = classement[c] ?? [];
    for (const a of athletes) {
      if (!q || a.nom_prenom.toLowerCase().includes(q) || a.club.toLowerCase().includes(q)) {
        results.push({ ...a, categorie: c });
      }
      if (results.length >= 30) break;
    }
    if (results.length >= 30) break;
  }

  return NextResponse.json(results);
}
