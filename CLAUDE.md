# Kayakbet

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
