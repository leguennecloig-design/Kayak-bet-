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
    .select("id, nom, date, discipline, lieu, status, created_at")
    .eq("id", params.id)
    .single();

  if (error || !comp) notFound();

  const { data: participants } = await supabase
    .from("participants")
    .select("id, nom, pays, cote")
    .eq("competition_id", params.id)
    .order("pays", { ascending: true })
    .order("cote", { ascending: true });

  return (
    <EditClient
      competition={comp}
      initialParticipants={participants ?? []}
    />
  );
}
