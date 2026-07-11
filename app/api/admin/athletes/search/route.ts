import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { searchAthletes } from "@/lib/athletes";

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
  const q = searchParams.get("q")?.trim() ?? "";
  const cat = searchParams.get("cat") ?? "";

  if (!q && !cat) {
    return NextResponse.json([]);
  }

  const results = await searchAthletes(q, cat);
  return NextResponse.json(results satisfies AthleteResult[]);
}
