# Kayakbet — Landing page (Next.js + PWA)

Page d'accueil marketing de **Kayakbet**, recréée à partir de la référence design HTML.
Stack : **Next.js 14 (App Router) + React + Tailwind CSS**, configurée en **PWA** via `next-pwa`.

## Démarrer

```bash
npm install
npm run dev      # http://localhost:3000
```

> Le service worker (PWA) est **désactivé en dev** et activé automatiquement en production
> (`npm run build && npm start`).

## Structure

```
app/
  layout.tsx          # <html>, polices Google (Anton / Archivo / Space Grotesk), meta PWA
  page.tsx            # assemble toutes les sections
  globals.css         # tokens CSS, boutons, nav, reveal, burger
  components/
    Logo.tsx          # wordmark (goutte SVG + "Kayakbet")
    Header.tsx        # header sticky + menu mobile (burger)
    Hero.tsx          # hero : copy + visuel goutte + cartes de cotes flottantes
    Stats.tsx         # bande de stats
    Features.tsx      # « Pourquoi Kayakbet »
    Steps.tsx         # « Comment ça marche » (3 étapes)
    FeaturedEvent.tsx # événement à la une + countdown + cotes
    CtaBand.tsx       # bande CTA finale
    Footer.tsx        # footer
    Toast.tsx         # toast démo (Apple / Connexion)
    useReveal.ts      # reveal au scroll (IntersectionObserver)
public/
  manifest.json       # manifest PWA
  icon-192.png / icon-512.png   # À FOURNIR (icônes app)
```

## À faire avant la prod

- **Icônes PWA** : ajouter `public/icon-192.png` et `public/icon-512.png` (référencées dans `manifest.json`).
- **Auth** : brancher « Connexion », « Continuer avec Apple » et « Créer mon compte »
  (aujourd'hui : ancres + toast démo) sur le vrai flux d'inscription / Sign in with Apple.
- **Données dynamiques** : l'événement à la une, les cotes, les stats et le compteur de
  parieurs sont actuellement en dur — candidats à un fetch.
- **Polices** : chargées via `<link>` Google Fonts. Pour de meilleures perfs, possibilité de
  repasser à `next/font/google` (téléchargement au build) ou de les auto-héberger.

## Design tokens

Couleurs et typographies sont définies dans `tailwind.config.ts` (couleurs `deep`, `navy`,
`surface`, `cyan`, `blue`, `coral`…) et `app/globals.css`. Fidélité haute (hifi) à la maquette.
