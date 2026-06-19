// Garde d'accès admin — à appeler en tête de chaque page/route admin.
//
// Vérifie côté serveur que :
//   1. L'utilisateur a une session Supabase valide
//   2. Son email correspond EXACTEMENT à ADMIN_EMAIL dans les variables d'env
//
// Si l'une des deux conditions échoue → redirige vers "/" (ou retourne 403
// pour les Route Handlers).

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAIL ?? "").split(",").map((e) => e.trim()).filter(Boolean);
}

export async function adminGuard(): Promise<void> {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !getAdminEmails().includes(user.email ?? "")) {
    redirect("/");
  }
}

export async function isAdmin(): Promise<boolean> {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  return !!user && getAdminEmails().includes(user.email ?? "");
}
