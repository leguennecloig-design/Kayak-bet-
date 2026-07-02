import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-server";
import { fetchFFCKSnapshot } from "@/lib/ffck-live";
import { isAdmin } from "@/lib/auth/admin-guard";

// 30s max — nécessite Vercel Pro (hobby = 10s)
export const maxDuration = 30;

/**
 * GET /api/live/sync
 *
 * Appelé par :
 *  - le Vercel Cron Job (toutes les minutes) via Authorization: Bearer {CRON_SECRET}
 *  - l'admin manuellement (session cookie)
 *
 * Connecte au WebSocket FFCK, récupère les classements des épreuves
 * en cours (état 3) ou officieuses (état 4), et upsert dans live_resultats.
 */
export async function GET(req: NextRequest) {
  // Auth : cron secret OU session admin
  const cronSecret  = process.env.CRON_SECRET;
  const authHeader  = req.headers.get("authorization") ?? "";
  const isCron      = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const adminOk     = isCron || (await isAdmin());

  if (!adminOk) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Récupère un snapshot WebSocket FFCK
  let entries;
  try {
    entries = await fetchFFCKSnapshot();
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur WebSocket FFCK", detail: String(err) },
      { status: 502 }
    );
  }

  if (!entries.length) {
    return NextResponse.json({
      ok: true, count: 0,
      message: "Aucune compétition live active en ce moment.",
    });
  }

  const supabase = createAdminSupabase();

  // Upsert dans live_resultats (clé unique : competition_key + epreuve + dossard)
  const { error } = await supabase
    .from("live_resultats")
    .upsert(entries, { onConflict: "competition_key,epreuve,dossard" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Stats de retour
  const competitions = [...new Set(entries.map(e => e.competition_nom))];
  const epreuves     = [...new Set(entries.map(e => e.epreuve))];
  const inProgress   = entries.filter(e => e.etat_epreuve === 3).length;
  const unofficial   = entries.filter(e => e.etat_epreuve === 4).length;

  return NextResponse.json({
    ok: true,
    count: entries.length,
    competitions,
    epreuves,
    in_progress: inProgress,
    unofficial,
    synced_at: new Date().toISOString(),
  });
}
