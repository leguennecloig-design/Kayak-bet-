// Page d'édition d'une compétition.
// Server Component : vérifie l'accès admin et charge les données initiales.
// L'interactivité (ajout/suppression participants, publication) est gérée
// dans le Client Component EditClient.

import { adminGuard } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import EditClient from "./EditClient";

export default async function EditCompetition({
  params,
}: {
  params: { id: string };
}) {
  await adminGuard();

  const supabase = createAdminSupabase();

  // select("*") plutôt qu'une liste de colonnes explicite : une migration
  // récente pas encore appliquée en base (debute_a / archived / etc.) ferait
  // échouer TOUTE la requête sur une colonne nommée qui n'existe pas encore
  // et 404 la page — select("*") ne dépend d'aucune colonne en particulier,
  // les champs absents sont simplement gérés via les valeurs par défaut
  // ci-dessous.
  const { data: comp, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !comp) notFound();

  const { data: participantsRaw } = await supabase
    .from("participants")
    .select("id, nom, pays, cote, categorie, code_bateau")
    .eq("competition_id", params.id)
    .order("categorie", { ascending: true })
    .order("cote",      { ascending: true });

  // Cotes avancées (Top3/Top5) — jointure manuelle par code_bateau pour les
  // afficher directement dans la startlist admin, sans ouvrir une modale.
  const codesBateaux = (participantsRaw ?? [])
    .map((p) => p.code_bateau as string | null)
    .filter((c): c is string => !!c);
  const { data: cotesRows } = codesBateaux.length > 0
    ? await supabase
        .from("cotes")
        .select("code_bateau, cote_top3, cote_top5, cote_top10")
        .eq("competition_id", params.id)
        .in("code_bateau", codesBateaux)
    : { data: [] };
  const cotesByCode = new Map(
    (cotesRows ?? []).map((c) => [c.code_bateau as string, c])
  );
  const participants = (participantsRaw ?? []).map((p) => {
    const extra = p.code_bateau ? cotesByCode.get(p.code_bateau as string) : undefined;
    return {
      ...p,
      cote_top3:  (extra?.cote_top3  as number | null) ?? null,
      cote_top5:  (extra?.cote_top5  as number | null) ?? null,
      cote_top10: (extra?.cote_top10 as number | null) ?? null,
    };
  });

  // Partants FFCK scrapés (uniquement si discipline = Descente et inscriptions présentes)
  const isDescente = (comp.discipline as string | null)?.toLowerCase().includes("descente") ?? false;
  let inscriptions: {
    id: string;
    code_bateau: string;
    nom: string;
    sexe: string | null;
    club: string | null;
    licence_valide: boolean | null;
    athlete_id: string | null;
  }[] = [];

  if (isDescente) {
    const { data: ins } = await supabase
      .from("inscriptions")
      .select("id, code_bateau, nom, sexe, club, licence_valide, athlete_id")
      .eq("competition_id", params.id)
      .order("nom", { ascending: true });
    inscriptions = ins ?? [];
  }

  return (
    <EditClient
      competition={{
        id:                    comp.id as string,
        nom:                   comp.nom as string,
        date:                  comp.date as string | null,
        discipline:            comp.discipline as string | null,
        lieu:                  comp.lieu as string | null,
        status:                comp.status as string,
        ffck_inscription_code: comp.ffck_inscription_code as number | null,
        ffck_match_status:     (comp.ffck_match_status as string | null) ?? "non_matche",
        type_competition:      comp.type_competition as string | null,
        algo_type:             (comp.algo_type as string | null) ?? null,
        type_epreuve:          comp.type_epreuve as string | null,
        paris_ouverts_a:       comp.paris_ouverts_a as string | null,
        debute_a:              comp.debute_a as string | null,
        leaderboard_visible:   (comp.leaderboard_visible as boolean | null) ?? false,
        archived:              (comp.archived as boolean | null) ?? false,
      }}
      initialParticipants={participants}
      inscriptions={inscriptions}
    />
  );
}
