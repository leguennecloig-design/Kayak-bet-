import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { parseQualifResults } from "@/lib/algo/qualif-results-parser";

function normalize(s: string) {
  return s.trim().replace(/\s+/g, " ").toUpperCase();
}

// Découpe "AUVOLAT G." ou "AUVOLAT Gabriel" en { surname: "AUVOLAT", first: "G" | "GABRIEL" }
// — dernier "mot" = prénom (ou son initiale), le reste = nom de famille
// (potentiellement plusieurs mots : "LE ROUZES", "DE HASQUE"...).
function surnameAndFirst(raw: string): { surname: string; first: string } {
  // "*" isolé = marqueur "aucune donnée" (voir external-cotes-parser-qualif.ts)
  // qui a pu se retrouver collé au nom sur une compétition créée avant ce
  // correctif — jamais un vrai token de nom, à ignorer pour le rapprochement.
  const tokens = raw.trim().split(/\s+/).filter(t => t && t !== "*");
  if (tokens.length <= 1) return { surname: normalize(raw.replace(/\*/g, "")), first: "" };
  const first = tokens[tokens.length - 1].replace(/\.$/, "");
  const surname = tokens.slice(0, -1).join(" ");
  return { surname: normalize(surname), first: normalize(first) };
}

// Même personne si le nom de famille est identique ET que les prénoms
// correspondent — exactement, ou l'un est l'initiale de l'autre (le fichier
// de cotes équipage abrège en "AUVOLAT G." alors que les résultats qualif
// donnent le prénom complet "AUVOLAT Gabriel").
function sameAthlete(a: string, b: string): boolean {
  const A = surnameAndFirst(a);
  const B = surnameAndFirst(b);
  if (!A.surname || A.surname !== B.surname) return false;
  if (A.first === B.first) return true;
  if (A.first.length === 1 && B.first.startsWith(A.first)) return true;
  if (B.first.length === 1 && A.first.startsWith(B.first)) return true;
  return false;
}

// Retrouve le participant correspondant à un nom donné dans une catégorie :
// d'abord une égalité exacte (cas normal, monoplace), puis, pour un
// équipage biplace ("NOM1 P1 / NOM2 P2"), une correspondance floue
// nom+initiale sur CHACUN des deux équipiers séparément — le fichier de
// résultats qualif liste souvent chaque équipier sur sa propre ligne, avec
// son prénom complet, alors que le fichier de cotes (création de la
// startlist) abrège le prénom en initiale dans le nom d'équipage.
function findParticipantId(
  categoryParticipants: { id: string; nom: string }[],
  rawName: string
): string | null {
  const target = normalize(rawName);
  const exact = categoryParticipants.find(p => normalize(p.nom) === target);
  if (exact) return exact.id;

  for (const p of categoryParticipants) {
    if (!p.nom.includes(" / ")) continue;
    for (const part of p.nom.split(" / ")) {
      if (sameAthlete(part, rawName)) return p.id;
    }
  }
  return null;
}

// POST /api/admin/competitions/[id]/import-qualif-results
// Compétition QUALIF uniquement (voir competitions.marche_qualif_finale) —
// importe juste la liste des qualifiés (+ Abs éventuels) par catégorie, voir
// lib/algo/qualif-results-parser.ts. Tout participant du départ non listé en
// "Qualifiés" et non "Abs" est automatiquement marqué non qualifié (perdu).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const supabase = createAdminSupabase();

  const { data: comp } = await supabase
    .from("competitions")
    .select("marche_qualif_finale")
    .eq("id", params.id)
    .maybeSingle();
  if (!comp?.marche_qualif_finale) {
    return NextResponse.json({ error: "Cette compétition n'est pas une compétition qualif" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
  }
  const content = await file.text();
  const parsed = parseQualifResults(content);

  if (parsed.categories.length === 0) {
    return NextResponse.json(
      { error: "Aucune catégorie reconnue dans ce fichier. Vérifie le format (\"### <Libellé> (<CODE>)\" suivi de \"Qualifiés :\" puis un nom par ligne)." },
      { status: 422 }
    );
  }

  const { data: participants, error: partErr } = await supabase
    .from("participants")
    .select("id, nom, categorie")
    .eq("competition_id", params.id);
  if (partErr) return NextResponse.json({ error: partErr.message }, { status: 500 });

  const byCategory = new Map<string, { id: string; nom: string }[]>();
  for (const p of participants ?? []) {
    const list = byCategory.get(p.categorie) ?? [];
    list.push({ id: p.id, nom: p.nom });
    byCategory.set(p.categorie, list);
  }

  const unmatched: string[] = [];
  const qualifiedIds = new Set<string>();
  const absIds = new Set<string>();
  let nonQualifiedCount = 0;
  let undeterminedCount = 0;

  for (const cat of parsed.categories) {
    const categoryParticipants = byCategory.get(cat.code);
    if (!categoryParticipants) {
      unmatched.push(`Catégorie "${cat.code}" introuvable dans la startlist de cette compétition`);
      continue;
    }

    const decided = new Set<string>(); // participant ids déjà traités (qualifié ou abs)
    // Un nom de la liste qui ne trouve aucun participant correspondant rend
    // le reste de la catégorie incertain : on ne peut plus supposer que
    // "personne d'autre = non qualifié" en confiance (ce nom manquant
    // pourrait être justement l'un des participants qu'on s'apprête à
    // classer par défaut). Dans ce cas on laisse le reste de la catégorie
    // indéterminé (qualified_finale reste null) plutôt que de risquer de
    // déclarer perdant à tort — le règlement (close/route.ts) traite déjà
    // qualified_finale=null comme void/remboursé.
    let categoryHasUnmatched = false;

    for (const rawName of cat.qualifies) {
      const id = findParticipantId(categoryParticipants, rawName);
      if (!id) { unmatched.push(`"${rawName}" (${cat.code}) : aucun participant correspondant`); categoryHasUnmatched = true; continue; }
      if (!qualifiedIds.has(id)) {
        await supabase.from("participants").update({ qualified_finale: true, dns: false }).eq("id", id);
      }
      decided.add(id);
      qualifiedIds.add(id);
    }

    for (const rawName of cat.abs) {
      const id = findParticipantId(categoryParticipants, rawName);
      if (!id) { unmatched.push(`"${rawName}" (${cat.code}, Abs) : aucun participant correspondant`); categoryHasUnmatched = true; continue; }
      if (!absIds.has(id)) {
        await supabase.from("participants").update({ qualified_finale: false, dns: true }).eq("id", id);
      }
      decided.add(id);
      absIds.add(id);
    }

    if (categoryHasUnmatched) {
      undeterminedCount += categoryParticipants.filter(p => !decided.has(p.id)).length;
      continue;
    }

    // Tout le reste de la catégorie = présent mais non qualifié (perdu) —
    // fiable uniquement quand TOUS les noms de la catégorie ont été trouvés.
    for (const p of categoryParticipants) {
      if (decided.has(p.id)) continue;
      await supabase.from("participants").update({ qualified_finale: false, dns: false }).eq("id", p.id);
      nonQualifiedCount++;
    }
  }

  return NextResponse.json({
    ok: true,
    categories: parsed.categories.length,
    qualified: qualifiedIds.size,
    nonQualified: nonQualifiedCount,
    abs: absIds.size,
    undetermined: undeterminedCount,
    unmatched,
    parseErrors: parsed.errors,
  });
}
