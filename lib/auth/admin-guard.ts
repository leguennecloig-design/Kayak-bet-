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

export async function adminGuard(): Promise<void> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminEmail = process.env.ADMIN_EMAIL;

  if (!user || user.email !== adminEmail) {
    redirect("/");
  }
}

// Version pour les Route Handlers (qui ne peuvent pas utiliser redirect())
// Retourne true si admin, false sinon
export async function isAdmin(): Promise<boolean> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return !!user && user.email === process.env.ADMIN_EMAIL;
}
