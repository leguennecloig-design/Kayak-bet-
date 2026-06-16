"use client";

import { useToast } from "./Toast";

export default function CtaBand() {
  const toast = useToast();

  return (
    <section className="pt-7 pb-24 bg-deep" id="cta">
      <div className="wrap">
        <div
          className="reveal relative overflow-hidden rounded-[26px] shadow-lg2 text-center border border-[var(--border-2)] px-6 py-11 min-[561px]:px-14 min-[561px]:py-[62px]"
          style={{
            background:
              "radial-gradient(130% 160% at 90% -20%, #11405C, #0A2A3D 60%)",
          }}
        >
          <div
            className="absolute left-1/2 -top-[120px] w-[420px] h-[420px] -translate-x-1/2 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle,rgba(40,215,230,.2),transparent 66%)",
            }}
          />
          <svg
            className="absolute left-0 right-0 bottom-[-2px] h-[150px] opacity-[.55] pointer-events-none"
            viewBox="0 0 1090 150"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              d="M0 80c136 0 136-34 272-34s136 34 272 34 136-34 273-34 136 34 273 34v70H0Z"
              fill="#0E3A52"
              opacity=".55"
            />
            <path
              d="M0 98c136 0 136-26 272-26s136 26 272 26 136-26 273-26 136 26 273 26v52H0Z"
              fill="#11C2C2"
              opacity=".1"
            />
          </svg>

          <h2 className="relative z-[1] font-anton italic uppercase text-white m-0 text-[42px] min-[561px]:text-[60px] leading-[0.86]">
            Prêt à prendre
            <br />
            le <span className="text-cyan">départ ?</span>
          </h2>
          <p className="relative z-[1] text-[17px] leading-[1.6] text-soft max-w-[470px] mx-auto mt-[18px]">
            Rejoins la communauté Kayakbet, reçois 1 000 crédits offerts et lance
            ton premier coupon dès aujourd'hui.
          </p>
          <div className="relative z-[1] flex flex-col min-[561px]:flex-row gap-[13px] justify-center mt-8 flex-wrap">
            <a className="btn btn-primary w-full min-[561px]:w-auto" href="#top">
              Créer mon compte gratuit
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h13M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <button
              className="btn btn-apple w-full min-[561px]:w-auto"
              onClick={() => toast("Connexion Apple — démo")}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M16.4 12.6c0-2 1.6-3 1.7-3-.9-1.4-2.4-1.5-2.9-1.6-1.2-.1-2.4.7-3 .7s-1.6-.7-2.6-.7c-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2.1 2.5 2 1-.04 1.4-.65 2.6-.65s1.6.65 2.6.63c1.1-.02 1.8-1 2.4-2 .8-1.1 1.1-2.2 1.1-2.3-.02 0-2.2-.85-2.2-3.4ZM14.6 6.6c.5-.7.9-1.6.8-2.6-.8.03-1.8.5-2.4 1.2-.5.6-1 1.6-.8 2.5.9.07 1.8-.45 2.4-1.1Z"
                  fill="#0A2A3D"
                />
              </svg>
              Continuer avec Apple
            </button>
          </div>
          <div className="relative z-[1] mt-[18px] font-grotesk font-semibold text-[12px] leading-none text-mute tracking-[.03em]">
            Aucune carte requise · crédits fictifs · réservé aux 18 ans et +
          </div>
        </div>
      </div>
    </section>
  );
}
