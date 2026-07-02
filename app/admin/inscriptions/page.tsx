import { adminGuard } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import InscriptionsClient from "./InscriptionsClient";

export default async function InscriptionsPage() {
  await adminGuard();

  const supabase = createAdminSupabase();

  // Compétitions Descente (draft ou published)
  const { data: comps } = await supabase
    .from("competitions")
    .select("id, nom, date, lieu, discipline, status, ffck_inscription_code, ffck_match_status")
    .in("status", ["draft", "published"])
    .or("discipline.ilike.%Descente%,discipline.is.null")
    .order("date", { ascending: false });

  // Compte des partants par compétition
  const compIds = (comps ?? []).map(c => c.id as string);
  const { data: countRows } = compIds.length
    ? await supabase
        .from("inscriptions")
        .select("competition_id")
        .in("competition_id", compIds)
    : { data: [] };

  const inscriptionsCount = new Map<string, number>();
  for (const row of countRows ?? []) {
    const k = row.competition_id as string;
    inscriptionsCount.set(k, (inscriptionsCount.get(k) ?? 0) + 1);
  }

  const competitions = (comps ?? []).map(c => ({
    id:                    c.id as string,
    nom:                   c.nom as string,
    date:                  c.date as string | null,
    lieu:                  c.lieu as string | null,
    discipline:            c.discipline as string | null,
    status:                c.status as string,
    ffck_inscription_code: c.ffck_inscription_code as number | null,
    ffck_match_status:     (c.ffck_match_status as string | null) ?? "non_matche",
    nb_partants:           inscriptionsCount.get(c.id as string) ?? 0,
  }));

  return <InscriptionsClient competitions={competitions} />;
}
