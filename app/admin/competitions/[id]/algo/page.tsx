// Étape intermédiaire après l'import des partants (scraping FFCK ou import
// manuel) : choisir l'algo de cotes avant de calculer, puis on atterrit sur
// la page d'édition habituelle (nom, brouillon/publié, participants, clôture...).

import { adminGuard } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import AlgoChoiceClient from "./AlgoChoiceClient";

export default async function ChoixAlgoPage({
  params,
}: {
  params: { id: string };
}) {
  await adminGuard();

  const supabase = createAdminSupabase();

  const { data: comp, error } = await supabase
    .from("competitions")
    .select("id, nom, algo_type")
    .eq("id", params.id)
    .single();

  if (error || !comp) notFound();

  const { count: inscriptionsCount } = await supabase
    .from("inscriptions")
    .select("id", { count: "exact", head: true })
    .eq("competition_id", params.id);

  return (
    <AlgoChoiceClient
      competitionId={comp.id as string}
      competitionNom={comp.nom as string}
      initialAlgoType={(comp.algo_type as string | null) ?? ""}
      inscriptionsCount={inscriptionsCount ?? 0}
    />
  );
}
