-- Corrections de policies RLS trouvées lors d'un audit sécurité complet.
-- Plusieurs policies trop permissives étaient exploitables directement
-- depuis le client Supabase du navigateur (clé anon/authenticated), en plus
-- des routes API qui, elles, passent déjà par le client admin (service role,
-- qui ignore RLS). Vérifié : aucune fonctionnalité réelle du site n'écrit
-- dans ces tables via le client RLS côté navigateur (zéro
-- `.from("users"|"resultats"|"friendships")` en dehors de fichiers
-- `route.ts` server-side) — ces policies n'étaient donc qu'une surface
-- d'attaque, jamais utilisées légitimement.

-- 1. CRITIQUE : n'importe quel utilisateur connecté pouvait insérer/modifier
-- des lignes dans `resultats` (policy ALL + USING(true)/WITH CHECK(true),
-- sans clause TO ni rôle => PUBLIC), ce qui permettait de fabriquer un
-- résultat de compétition truqué et de se faire créditer un gain via la
-- clôture admin (qui fait confiance à cette table pour déterminer les
-- gagnants). On retire l'accès en écriture public/authenticated ; la
-- lecture publique des résultats publiés/clos reste inchangée (policy
-- séparée "Public voir resultats comp publiees", non touchée).
DROP POLICY IF EXISTS "Admin full access resultats" ON public.resultats;

-- 2. CRITIQUE : n'importe quel utilisateur connecté pouvait modifier
-- directement sa propre ligne `users` (policy UPDATE sans WITH CHECK, donc
-- sans restriction de colonnes) — un simple
-- `supabase.from('users').update({ balance: 999999 }).eq('id', monId)`
-- depuis la console du navigateur suffisait à se créditer directement,
-- ou à réécrire `referral_code`/`referred_by`. Toutes les écritures
-- légitimes du profil passent déjà par app/api/user/profile (client admin,
-- service role, qui ignore RLS) — cette policy n'était utile à rien de
-- légitime.
DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- 3. MOYEN : un utilisateur pouvait modifier n'importe quelle colonne d'une
-- ligne `friendships` où il est une des deux parties (policy UPDATE sans
-- WITH CHECK), y compris s'auto-accepter sa propre demande d'ami envoyée.
-- Toutes les écritures légitimes passent déjà par app/api/friends/[id]
-- (client admin) — même raisonnement que ci-dessus.
DROP POLICY IF EXISTS "friendships_update_own" ON public.friendships;
