import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kayakbet — Paris sportifs de kayak, 100% gratuit",
  description:
    "Pronostique sur le circuit mondial de kayak de slalom et de descente. Crédits fictifs, sensations réelles — sans dépôt, sans risque.",
  manifest: "/manifest.json",
  // Favicon uniquement ici. Les apple-touch-icon sont posés en balises <link>
  // brutes dans le <head> (voir plus bas) pour un contrôle total : URL neuve
  // /icons/... (contourne le cache iOS qui mémorise l'icône par URL), fichier
  // opaque, et tailles explicites.
  icons: {
    icon: "/favicon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kayakbet",
  },
};

export const viewport: Viewport = {
  themeColor: "#071F2D",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        {/* Icônes d'accueil iOS — balises brutes garanties dans le HTML statique.
            URL /icons/... totalement neuve pour forcer iOS à re-télécharger
            (il cache l'icône par URL, l'ancienne /apple-touch-icon.png pouvait
            rester bloquée sur "pas d'icône"). Fichiers opaques, tailles explicites. */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/apple-touch-icon-167.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon-152.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,800;1,900&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID!} />
    </html>
  );
}
