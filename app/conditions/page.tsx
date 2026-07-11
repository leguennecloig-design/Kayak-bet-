import type { Metadata } from "next";
import Logo from "../components/Logo";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation — Kayakbet",
  description: "Conditions générales d'utilisation de Kayakbet, le pronostic 100% gratuit sur le circuit mondial de kayak de descente.",
};

const SECTIONS = [
  {
    h: "1. Objet",
    body: [
      "Kayakbet est un jeu de pronostics 100% gratuit sur le circuit mondial de kayak de descente. L'ensemble des crédits utilisés sur la plateforme sont fictifs : ils n'ont aucune valeur monétaire, ne peuvent ni être achetés avec de l'argent réel, ni être échangés, retirés ou convertis en argent réel ou en tout autre bien ou service.",
      "Aucun paiement n'est demandé pour créer un compte ou participer, et aucun gain réel n'est distribué à quelque titre que ce soit.",
    ],
  },
  {
    h: "2. Éligibilité",
    body: [
      "L'inscription est réservée aux personnes âgées d'au moins 18 ans. En créant un compte, tu confirmes avoir l'âge requis.",
      "Un compte est strictement personnel et nominatif. La création de comptes multiples par une même personne, notamment dans le but de contourner les mécanismes de parrainage ou de récompense, n'est pas autorisée et peut entraîner la suspension des comptes concernés.",
    ],
  },
  {
    h: "3. Compte utilisateur",
    body: [
      "Tu es responsable de la confidentialité de tes identifiants de connexion et de toute activité effectuée depuis ton compte.",
      "Kayakbet se réserve le droit de suspendre ou de supprimer un compte en cas d'usage frauduleux, abusif, ou de non-respect des présentes conditions.",
    ],
  },
  {
    h: "4. Crédits fictifs, parrainage et récompenses",
    body: [
      "Le solde de crédits fictifs affiché sur un compte (solde de départ, gains de pronostics, bonus de parrainage, récompenses ponctuelles telles que le bonus Instagram, etc.) sert uniquement à mesurer la performance au sein du jeu et à alimenter le classement. Il ne constitue en aucun cas une valeur financière réelle.",
      "Les montants de crédits accordés (solde de départ, bonus de parrainage, récompenses) sont fixés librement par Kayakbet et peuvent évoluer à tout moment, y compris à la baisse, sans préavis.",
      "Kayakbet se réserve le droit d'annuler des crédits obtenus de façon frauduleuse (comptes multiples, abus manifeste des systèmes de parrainage ou de récompense) et de suspendre les comptes concernés.",
    ],
  },
  {
    h: "5. Jeu responsable",
    body: [
      "Kayakbet n'est pas un service de paris en argent réel et n'entre pas dans le champ des jeux d'argent réglementés. Il n'y a donc ni mise, ni gain réel, ni risque financier.",
      "Nous encourageons néanmoins un usage raisonné et ludique de la plateforme.",
    ],
  },
  {
    h: "6. Propriété intellectuelle",
    body: [
      "La marque Kayakbet, son logo, sa charte visuelle et l'ensemble des contenus du site sont la propriété de Kayakbet et ne peuvent être reproduits sans autorisation préalable.",
    ],
  },
  {
    h: "7. Responsabilité",
    body: [
      "Kayakbet met tout en œuvre pour assurer l'exactitude des données de compétitions et de classements affichées, sans garantie de disponibilité continue ni d'absence d'erreur. Le service est fourni « en l'état ».",
    ],
  },
  {
    h: "8. Modification des présentes conditions",
    body: [
      "Ces conditions peuvent être mises à jour à tout moment. La version en vigueur est celle publiée sur cette page.",
    ],
  },
  {
    h: "9. Contact",
    body: [
      "Pour toute question relative à ces conditions, tu peux nous écrire à contact.loig@kayakbet.fr.",
    ],
  },
];

export default function ConditionsPage() {
  return (
    <div style={{ background: "var(--deep, #071F2D)", color: "var(--text, #E9F3F7)", minHeight: "100vh" }}>
      <header className="wrap flex items-center justify-between py-6">
        <a href="/" className="inline-block">
          <Logo id="cond" />
        </a>
        <a href="/" className="font-archivo font-bold text-[13px] text-cyan hover:text-white transition-colors">
          ← Retour à l'accueil
        </a>
      </header>

      <main className="wrap pb-24 pt-6 max-w-[760px]">
        <p className="font-grotesk font-bold text-[11px] tracking-[.16em] uppercase text-cyan mb-3">
          Dernière mise à jour · Juillet 2026
        </p>
        <h1 className="font-anton italic uppercase text-white text-[38px] min-[561px]:text-[52px] leading-[0.92] mb-8">
          Conditions générales<br />d&apos;utilisation
        </h1>

        <div className="flex flex-col gap-9">
          {SECTIONS.map((s) => (
            <section key={s.h}>
              <h2 className="font-archivo font-extrabold text-[18px] text-white mb-3">{s.h}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="font-archivo text-[14.5px] leading-[1.7] text-soft mb-3 last:mb-0">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
