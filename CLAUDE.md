# Kayakbet

## Algo de cotes — v4 (`lib/algo/`)

Pipeline : score composite absolu → double passe Bradley-Terry → CDF normale (probas) → conversion en cote. Tous les paramètres sont dans `lib/algo/params.ts` (`ALGO_PARAMS`), tunables.

### Choix de l'algo
`competitions.algo_type` (`sprint | classique | mass_start | sprint_finale`) est choisi explicitement à la création (formulaires admin, obligatoire). `calculate-cotes` le lit (override formulaire > base) pour dériver le format et `disciplineEstSprint` — plus de détection sur le nom/discipline. Seuls **classique** et **sprint** utilisent le scoring v4 ci-dessous ; **mass_start** et **sprint_finale** combinent ce score de base avec les résultats d'une manche précédente (engines inchangés).

### Saison
Uniquement **2026** : `ALGO_PARAMS.SAISON_COTES = 2026` (filtre `ffck_competitions.annee`), pas l'horloge murale. Le classement numérique vient de la table `athletes` (seedée 2026).

### Score composite absolu `S_abs` (`calculerScoreComposite`, `bradley-terry.ts`)
Normalisé sur les sources présentes, ∈ [0,1] :
- **Cas standard** : national **0.50** + numérique **0.25** (le relatif 0.25 est ajouté ensuite dans la force).
- **Cas M22 avec SEF 2026** : SEF **0.50** + national **0.25** + numérique **0.15** (relatif 0.10 ensuite). Déclenché si la catégorie contient `M22` ET l'athlète a ≥ 1 résultat SEF 2026 ; sinon cas standard.
- Bloc **national** = N1 **71%** / IR **29%** (`V4_N1_RATIO`/`V4_IR_RATIO`, hérité du ratio 25/10 v3 — à réajuster si le volume IR 2026 est faible).
- Pénalité `FIAB_FALLBACK_AUTRE_DISCIPLINE` (0.75) appliquée aux scores de course quand on se rabat sur l'autre discipline.
- Renormalisation : une source absente redistribue son poids (un athlète sans résultat national → 100% numérique).

### Relatif catégorie — double Bradley-Terry (`computeForces`, `cotes-engine.ts`)
1. `S_abs` (+ ajustement confrontations directes ±25%), clampé [0,1].
2. 1re passe BT sur `S_abs` → `S_rel = 1 − (rang−1)/(N−1)`.
3. Force finale `F = (1−wRel)·S_abs + wRel·S_rel`, `wRel` = 0.25 (std) / 0.10 (M22-SEF).
4. 2e passe BT sur `F` → rang espéré final → probas Top-N (CDF normale, `sigmaFor`).
> Architecture volontairement tunable (« flou » assumé), à affiner après tests réels.

### Cotes (`probToCote(prob, min, max)`, `bradley-terry.ts`)
`cote = clamp(MARGE/prob, min, max)` arrondi au 0.05. Ancrages (planchers, calibrés) : **Top1 1.68**, **Top3 1.15**, **Top5 1.05**. Un favori évident tombe au plancher. Plafonds (v4.2, resserrés) : **Top1 30**, **Top3 15**, **Top5 10**, **Top10 8**, Top20 8 (legacy).
- **Place exacte** : cote **dynamique** = `probToCote(probExactPlace(rang, sigma, N), 1.05, 6)` (plafond `COTE_MAX_EXACT_PLACE`, v4.3). Calculée en direct côté client (rang_espere + sigma exposés par l'API cotes) selon la place choisie, **revalidée serveur** dans `POST /api/user/bets`. Place n°1 interdite (→ pari Vainqueur).
- **Temps au dixième / à la seconde** : pas de modèle de temps absolu → heuristique basée sur la prédictibilité (`p1`) × facteur de précision (`K_EXACT_TIME_TENTH`/`_SECOND`). Cote **par athlète** (ne dépend pas du temps tapé). Dixième plafond **15** (`COTE_MAX_EXACT_TIME`), **seconde plafond 5** (`COTE_MAX_EXACT_TIME_SECOND`, v4.3). *(Amélioration future : vrai modèle de temps pour une cote dépendant de la valeur.)*
- **Top 10 / Top 20** : retirés de l'UI de paris ; colonnes + règlement conservés pour les paris déjà placés.

### Garde-fou classement numérique — v4.2 (`capCoteByRangNumerique`, `bradley-terry.ts`)
Un athlète bien classé au classement numérique 2026 (`rang_national`) est un favori réel, même si son composite est dilué par des résultats de course faibles ou absents — le Bradley-Terry seul ne suffisait pas toujours à l'en sortir (cotes aberrantes malgré un bon classement). Cape directement `cote_top1/3/5/10`, **par-dessus** le clamp `[min,max]` habituel, appliqué dans `cotes-engine.ts`/`mass-start-engine.ts`/`sprint-finale-engine.ts` :
- `rang_national ≤ 10` → Top1 ≤ **10**, Top3 ≤ **6**, Top5 ≤ **4**, Top10 ≤ **3**.
- `rang_national ≤ 20` → Top1 ≤ **20**, Top3 ≤ **12**, Top5 ≤ **8**, Top10 ≤ **6**.
- Au-delà (rang inconnu = 999 inclus) : pas de cap, seul le plafond général s'applique.
Valeurs tunables (`RANG_NUM_CAP10_*`/`RANG_NUM_CAP20_*` dans `params.ts`), à ajuster après tests réels.

### Bug v3 corrigé
Les cotes place exacte / temps exact étaient figées en dur (`5.00` / `20.00`, aucune proba). Désormais calculées. Pénalité fallback autre-discipline désormais réellement appliquée.

### Import de cotes précalculées (.txt)
Troisième mode de création (`app/admin/competitions/nouvelle/NouvelleCompetitionClient.tsx`, à côté de "Inscriptions FFCK" et "Création manuelle") : `ImportCotesFileClient.tsx` accepte un fichier `.txt` où la startlist ET les cotes (Top1/Top3/Top5/Top10, par catégorie) ont déjà été calculées ailleurs — **aucun recalcul** n'est fait, les valeurs du fichier sont enregistrées telles quelles.
- Format attendu (parseur `lib/algo/external-cotes-parser.ts`) : sections `<Libellé> (<CODE>) – N partant(s)` suivies d'un tableau `Dos / Nom / Club / T1 / T3 / T5 / T10` (padding ≥ 2 espaces entre colonnes ; `N/D` = marché non pertinent → `null`). Parsing structurel robuste à l'encodage (split sur les espaces de padding, pas sur la position de colonne) ; extraction du nom/lieu/dates de l'en-tête en best-effort, toujours éditable avant création.
- `POST /api/admin/parse-cotes-file` (preview, ne touche pas la DB) → `POST /api/admin/import-cotes-file` (crée `competitions` avec `algo_type: null`, puis `participants` + `cotes` directement, `code_bateau` synthétique `${categorie}-${dossard}`).
- Cotes avancées T3/T5/T10 éditables en ligne dans la startlist admin (`EditClient.tsx`, à côté de la cote Top1 déjà éditable) — `PATCH /api/admin/competitions/[id]/participants/[pid]` accepte maintenant `cote_top3`/`cote_top5`/`cote_top10` en plus de `cote`/`nom`/`pays`, mis à jour sur la table `cotes` (jointe par `competition_id` + `code_bateau`).

## Discord — Onboarding & Rôles

### Structure d'accès
- `@everyone` ne voit que la catégorie `📋 INFOS` (règlement + présentation)
- Les catégories `💬 COMMUNAUTÉ`, `🛶 KAYAK & COMPÉTITIONS`, `🐛 SUPPORT & FEEDBACK`, `🎙️ VOCAUX` sont visibles uniquement par les rôles `Parieur` et `Athlète`
- L'accès complet est débloqué via réaction dans `#présentation-kayakbet`

### Message d'onboarding (`#présentation-kayakbet`)
```
🛶 Bienvenue sur Kayakbet !
Kayakbet, c'est le pronostic 100% gratuit sur le circuit mondial de kayak de descente. Crédits fictifs, sensations réelles — sans dépôt, sans risque.

👉 Avant d'accéder au serveur, pense à lire le #règlement.

Puis dis-nous qui tu es en réagissant ci-dessous :
🎣 = Je suis Parieur (fan, joueur sur la plateforme)
🏅 = Je suis Athlète (coureur de kayak descente, licencié FFCK)

Tu peux choisir les deux si tu es les deux !
```

### Config Carl-bot (Reaction Roles) — référence
- Salon : `#présentation-kayakbet`
- `🎣` → rôle `Parieur`
- `🏅` → rôle `Athlète`
- Mode : Normal (cumul autorisé, pas exclusif)
- `#règlement` : lecture seule, aucune réaction, texte des règles uniquement

### Rôles liés
- `Parieur` : rôle par défaut fan/joueur, cumulable
- `Athlète` : attribution manuelle recommandée en complément (vérification identité par Admin) en plus de la réaction, pour éviter usurpation — à décider si on garde l'auto-attribution simple ou si on ajoute une vérification manuelle plus tard
