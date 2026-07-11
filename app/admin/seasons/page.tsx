import { adminGuard } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import SeasonsClient from "./SeasonsClient";

export default async function SeasonsPage() {
  await adminGuard();

  const supabase = createAdminSupabase();
  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, label, is_current, started_at, created_at")
    .order("started_at", { ascending: false });

  return <SeasonsClient initialSeasons={seasons ?? []} />;
}
