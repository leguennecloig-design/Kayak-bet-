import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin-guard";
import { createAdminSupabase } from "@/lib/supabase-server";
import { notifyAllUsers } from "@/lib/notifications/create";

type AdminSupabase = ReturnType<typeof createAdminSupabase>;

// Si une migration récente (debute_a, archived...) n'a pas encore été
// appliquée en base, Postgres refuse l'UPDATE entier pour une colonne
// inconnue — ce qui bloquerait la sauvegarde de TOUS les champs, y compris
// ceux qui n'ont rien à voir. On retire la colonne manquante et on
// réessaie, pour que le reste se sauvegarde quand même en attendant que la
// migration soit appliquée.
async function updateCompetitionResilient(
  supabase: AdminSupabase,
  id: string,
  fields: Record<string, unknown>
): Promise<{ message: string } | null> {
  const attempt = { ...fields };
  for (let i = 0; i < Object.keys(fields).length + 1; i++) {
    if (Object.keys(attempt).length === 0) return null;
    const { error } = await supabase.from("competitions").update(attempt).eq("id", id);
    if (!error) return null;
    const missingCol = /column "(\w+)" of relation "competitions" does not exist/.exec(error.message)?.[1];
    if (!missingCol || !(missingCol in attempt)) return error;
    console.warn(`[admin competitions PATCH] colonne "${missingCol}" absente en base (migration pas encore appliquée) — ignorée pour cette sauvegarde`);
    delete attempt[missingCol];
  }
  return { message: "Échec de la sauvegarde (colonnes manquantes)" };
}

// PATCH /api/admin/competitions/[id] — met à jour les infos ou le statut
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await req.json();

  // On n'accepte que les champs modifiables
  const allowed: Record<string, unknown> = {};
  if (body.nom        !== undefined) allowed.nom        = body.nom;
  if (body.date       !== undefined) allowed.date       = body.date || null;
  if (body.discipline !== undefined) allowed.discipline = body.discipline || null;
  if (body.lieu       !== undefined) allowed.lieu       = body.lieu || null;
  if (body.status     !== undefined) allowed.status     = body.status;
  if (body.type_competition !== undefined) allowed.type_competition = body.type_competition || null;
  if (body.algo_type !== undefined) allowed.algo_type = body.algo_type || null;
  if (body.paris_ouverts_a !== undefined) allowed.paris_ouverts_a = body.paris_ouverts_a || null;
  if (body.debute_a !== undefined) allowed.debute_a = body.debute_a || null;
  if (body.leaderboard_visible !== undefined) allowed.leaderboard_visible = !!body.leaderboard_visible;
  if (body.archived !== undefined) allowed.archived = !!body.archived;

  const supabase = createAdminSupabase();

  // Détecter la transition vers "published" pour notifier les joueurs —
  // seulement au moment où elle devient pariable, pas à chaque sauvegarde.
  let justPublished = false;
  let nom = "";
  if (allowed.status === "published") {
    const { data: before } = await supabase
      .from("competitions")
      .select("status, nom")
      .eq("id", params.id)
      .single();
    justPublished = !!before && before.status !== "published";
    nom = before?.nom ?? "";
  }

  const error = await updateCompetitionResilient(supabase, params.id, allowed);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (justPublished) {
    // Si une heure d'ouverture des paris est programmée dans le futur, la
    // compétition est publiée (visible) mais pas encore pariable — le texte
    // de la notif ne doit pas annoncer une ouverture immédiate.
    const parisOuvertsA = allowed.paris_ouverts_a as string | null | undefined;
    const opensLater = parisOuvertsA && new Date(parisOuvertsA).getTime() > Date.now();
    await notifyAllUsers(supabase, {
      type: "competition",
      title: "Nouvelle compétition disponible",
      body: opensLater
        ? `${nom} est publiée — paris ouverts à partir du ${new Date(parisOuvertsA!).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}.`
        : `${nom} est ouverte aux paris !`,
      url: "/app",
    });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/competitions/[id] — supprime une compétition (et ses participants via cascade)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from("competitions")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
