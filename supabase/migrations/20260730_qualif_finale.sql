-- Compétitions "qualif" : une manche de qualification dont le seul marché de
-- pari est "passage en finale" (quota fixe de qualifiés par catégorie), pas
-- de Top1/3/5/10 ni place/temps exact. Les cotes sont importées telles
-- quelles (voir lib/algo/external-cotes-parser-qualif.ts), stockées dans
-- participants.cote comme pour l'import cotes classique.
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS marche_qualif_finale BOOLEAN NOT NULL DEFAULT false;

-- Nombre de qualifiés en finale pour la catégorie de ce participant — dupliqué
-- sur chaque ligne de la catégorie (pas de table catégories séparée dans ce
-- schéma). Sert à la fois à l'affichage public ("X qualifiés en finale") et
-- au règlement (rang <= qualifies_finale = qualifié = pari gagné).
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS qualifies_finale INTEGER;
