import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase-server";

type Selection = { competitionId?: string };

// GET /api/competitions/bettors-count
// Retourne { [competitionId]: nombre de parieurs distincts } pour toutes les
// compétitions référencées par au moins un pari. Lu via `selections` (pas la
// seule colonne `bets.competition_id`, qui reste NULL pour un pari combiné
// sur plusieurs compétitions) pour compter aussi ces cas.
export async function GET() {
  const adminSb = createAdminSupabase();

  const { data, error } = await adminSb.from("bets").select("user_id, selections");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const bettorsByComp = new Map<string, Set<string>>();
  for (const b of data ?? []) {
    const sels: Selection[] = Array.isArray(b.selections) ? b.selections : [];
    const compIds = new Set(sels.map(s => s?.competitionId).filter((id): id is string => !!id));
    for (const compId of compIds) {
      const set = bettorsByComp.get(compId) ?? new Set<string>();
      set.add(b.user_id as string);
      bettorsByComp.set(compId, set);
    }
  }

  const result: Record<string, number> = {};
  for (const [compId, users] of bettorsByComp) result[compId] = users.size;
  return NextResponse.json(result);
}
