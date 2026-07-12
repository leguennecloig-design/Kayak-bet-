import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kayakbet — Paris sportifs de kayak, 100% gratuit",
  description:
    "Pronostique sur le circuit mondial de kayak de slalom et de descente. Crédits fictifs, sensations réelles — sans dépôt, sans risque.",
  manifest: "/manifest.json",
  // Icône d'accueil iOS : lien explicite vers un fichier statique à un chemin
  // stable et sans hash (/apple-touch-icon.png, servi depuis public/). L'ancien
  // fichier-convention app/apple-icon.png générait un lien avec un ?hash qui
  // n'était pas récupéré de façon fiable par le "Ajouter à l'écran d'accueil"
  // de Safari (icône remplacée par la lettre initiale). Le chemin bien connu
  // /apple-touch-icon.png est aussi celui qu'iOS cherche par défaut.
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
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
