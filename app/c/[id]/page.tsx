"use client";

import { useEffect, useState } from "react";
import Logo from "@/app/components/Logo";

type Comp = { id: string; nom: string; date: string; lieu: string; discipline: string };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function CompetitionInvitePage({ params }: { params: { id: string } }) {
  const [comp, setComp] = useState<Comp | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [ref, setRef] = useState<string | null>(null);

  useEffect(() => {
    setRef(new URLSearchParams(window.location.search).get("ref"));
    fetch(`/api/public/competitions/${params.id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setComp)
      .catch(() => setNotFound(true));
  }, [params.id]);

  const query = `comp=${params.id}${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`;
  const loginHref = `/login?${query}`;

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: "radial-gradient(120% 130% at 88% -12%, #12435F, #0A2A3D 56%)" }}
    >
      <div className="wrap py-16 flex flex-col items-center text-center max-w-[560px]">
        <a href="/" aria-label="Kayakbet" className="mb-10">
          <Logo id="invite" />
        </a>

        <span className="eyebrow">
          <span className="tick" /> Tu es invité·e à parier
        </span>

        {notFound ? (
          <>
            <h1 className="font-anton italic uppercase text-white mt-6 text-[42px] leading-[0.9]">
              Compétition introuvable
            </h1>
            <p className="lede text-[17px] leading-[1.6] text-soft mt-5 max-w-[440px]">
              Ce lien ne correspond à aucune compétition ouverte pour l&apos;instant.
            </p>
          </>
        ) : comp ? (
          <>
            <h1 className="font-anton italic uppercase text-white mt-6 text-[38px] min-[561px]:text-[48px] leading-[1.02]">
              {comp.nom}
            </h1>
            <p className="font-grotesk font-semibold text-[14px] tracking-[.04em] uppercase text-mute mt-3">
              {comp.lieu} · {fmtDate(comp.date)}
            </p>
            <p className="lede text-[17.5px] leading-[1.6] text-soft mt-6 max-w-[440px]">
              Crée ton compte et place ton premier pari sur cette compétition :
              <b className="text-cyan"> vous gagnez 200 crédits chacun</b>, toi et la
              personne qui t&apos;a invité.
            </p>

            <div className="flex flex-col min-[481px]:flex-row gap-[13px] mt-9 w-full min-[481px]:w-auto">
              <a className="btn btn-primary w-full min-[481px]:w-auto" href={loginHref}>
                Créer mon compte gratuit
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
            <p className="hero-alt mt-[16px] font-archivo font-semibold text-[13.5px] leading-[1.5] text-mute">
              Déjà membre ?{" "}
              <a className="text-cyan font-bold cursor-pointer" href={loginHref}>Connexion</a>
            </p>
          </>
        ) : (
          <p className="lede text-[17px] leading-[1.6] text-soft mt-8">Chargement…</p>
        )}
      </div>
    </main>
  );
}
