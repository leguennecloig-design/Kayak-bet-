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

  const { data: comp, error } = await supabase
    .from("competitions")
    .select("id, nom, date, discipline, lieu, status, created_at, ffck_inscription_code, ffck_match_status")
    .eq("id", params.id)
    .single();

  if (error || !comp) notFound();

  const { data: participants } = await supabase
    .from("participants")
    .select("id, nom, pays, cote, categorie")
    .eq("competition_id", params.id)
    .order("categorie", { ascending: true })
    .order("cote",      { ascending: true });

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
      }}
      initialParticipants={participants ?? []}
      inscriptions={inscriptions}
    />
  );
}
