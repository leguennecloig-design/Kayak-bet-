// Client Supabase côté serveur (Next.js Server Components / Route Handlers)
// Utilise les cookies de la requête entrante pour accéder à la session auth.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client standard — respecte RLS, lit la session de l'utilisateur connecté
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // appelé depuis un Server Component en lecture seule — ignoré
          }
        },
      },
    }
  );
}

// Client admin — utilise la service_role key, bypass RLS complètement.
// À n'utiliser QUE dans des routes déjà protégées par adminGuard().
export function createAdminSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}
