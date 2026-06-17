"use client";

import { useToast } from "./Toast";

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path
      d="M16.4 12.6c0-2 1.6-3 1.7-3-.9-1.4-2.4-1.5-2.9-1.6-1.2-.1-2.4.7-3 .7s-1.6-.7-2.6-.7c-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2.1 2.5 2 1-.04 1.4-.65 2.6-.65s1.6.65 2.6.63c1.1-.02 1.8-1 2.4-2 .8-1.1 1.1-2.2 1.1-2.3-.02 0-2.2-.85-2.2-3.4ZM14.6 6.6c.5-.7.9-1.6.8-2.6-.8.03-1.8.5-2.4 1.2-.5.6-1 1.6-.8 2.5.9.07 1.8-.45 2.4-1.1Z"
      fill="#0A2A3D"
    />
  </svg>
);

export default function Hero() {
  const toast = useToast();

  return (
    <section
      className="overflow-hidden border-b border-[var(--border)]"
      style={{
        background:
          "radial-gradient(120% 130% at 88% -12%, #12435F, #0A2A3D 56%)",
      }}
    >
      <div className="wrap grid grid-cols-1 min-[921px]:grid-cols-[1.05fr_.95fr] gap-[14px] min-[921px]:gap-[40px] items-center py-[48px_56px] min-[921px]:py-[72px_88px]">
        {/* copy */}
        <div>
          <span className="eyebrow">
            <span className="tick" /> Paris sportifs · 100% gratuit
          </span>
          <h1 className="font-anton italic uppercase text-white mt-[22px] text-[58px] min-[561px]:text-[72px] min-[921px]:text-[92px] leading-[0.82] tracking-[.005em]">
            Ride
            <br />
            the <span className="text-cyan">rankings.</span>
          </h1>
          <p className="text-[18px] leading-[1.6] text-soft max-w-[466px] mt-6">
            Suivez et pronostiquez chaque course du circuit mondial de descente. Sans argent réel, sans risque — juste le sport.


          </p>

          <div className="flex flex-col min-[561px]:flex-row gap-[13px] mt-[34px] flex-wrap">
            <a className="btn btn-primary w-full min-[561px]:w-auto" href="#cta">
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
              <AppleIcon />
              Continuer avec Apple
            </button>
          </div>

          <p className="mt-4 font-archivo font-semibold text-[13.5px] leading-[1.5] text-mute">
            Déjà membre ?{" "}
            <a
              className="text-cyan font-bold cursor-pointer"
              onClick={() => toast("Connexion — démo")}
            >
              Connexion
            </a>
          </p>

          <div className="flex items-center gap-[11px] mt-7 font-archivo font-semibold text-[13px] leading-[1.4] text-mute">
            <span className="flex">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-deep"
                  style={{
                    marginLeft: i === 0 ? 0 : -9,
                    background:
                      "linear-gradient(135deg,#28D7E6,#1F73FF)",
                  }}
                />
              ))}
            </span>
            <span>
              Déjà <b className="text-white">12 000+ parieurs</b> sur la ligne
              de départ
            </span>
          </div>
        </div>

        {/* visual */}
        <div
          className="relative flex items-center justify-center min-h-[340px] min-[921px]:min-h-[430px] order-first min-[921px]:order-none mb-2 min-[921px]:mb-0"
          aria-hidden="true"
        >
          <span className="absolute rounded-full border-[1.5px] border-[rgba(40,215,230,.22)] w-[584px] h-[584px] opacity-[.55] hidden min-[921px]:block" />
          <span className="absolute rounded-full border-[1.5px] border-[rgba(40,215,230,.22)] w-[456px] h-[456px]" />
          <span className="absolute rounded-full border-[1.5px] border-[rgba(40,215,230,.22)] w-[340px] h-[340px]" />

          <svg
            viewBox="0 0 230 262"
            fill="none"
            className="relative w-[170px] h-[196px] min-[921px]:w-[222px] min-[921px]:h-[254px] animate-bob"
            style={{ filter: "drop-shadow(0 30px 50px rgba(31,115,255,.4))" }}
          >
            <path
              d="M115 8C68 73 34 113 34 156a81 81 0 0 0 162 0C196 113 162 73 115 8Z"
              fill="url(#bd)"
            />
            <path
              d="M64 168c18 0 18 16 36 16s18-16 36-16 18 16 36 16"
              stroke="#fff"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              opacity=".95"
            />
            <path
              d="M70 196c15 0 15 13 30 13s15-13 30-13"
              stroke="#fff"
              strokeWidth="7"
              fill="none"
              strokeLinecap="round"
              opacity=".6"
            />
            <defs>
              <linearGradient
                id="bd"
                x1="34"
                y1="8"
                x2="196"
                y2="240"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#28D7E6" />
                <stop offset="1" stopColor="#1F73FF" />
              </linearGradient>
            </defs>
          </svg>

          <OddsFloat
            cls="top-[30px] right-[-8px] min-[561px]:right-[-8px] animate-bob-a"
            initials="DT"
            name="D. Tostain"
            sub="FRANCE · K1"
            odd="1.65"
          />
          <OddsFloat
            cls="bottom-[42px] left-[-16px] animate-bob-b"
            initials="CF"
            name="C. Ferrion"
            sub="France · C1"
            odd="1.39"
            avBg="linear-gradient(140deg,#11C2C2,#1F73FF)"
          />
        </div>
      </div>
    </section>
  );
}

function OddsFloat({
  cls,
  initials,
  name,
  sub,
  odd,
  avBg = "linear-gradient(140deg,#28D7E6,#1F73FF)",
}: {
  cls: string;
  initials: string;
  name: string;
  sub: string;
  odd: string;
  avBg?: string;
}) {
  return (
    <div
      className={`absolute bg-surface border border-[var(--border-2)] rounded-2xl shadow-lg2 px-[15px] py-[13px] flex items-center gap-3 ${cls}`}
    >
      <div
        className="w-[38px] h-[38px] rounded-[10px] flex-none flex items-center justify-center"
        style={{ background: avBg }}
      >
        <b className="font-archivo font-extrabold text-[14px] text-white">
          {initials}
        </b>
      </div>
      <div>
        <div className="font-archivo font-extrabold text-[13px] text-white">
          {name}
        </div>
        <div className="font-grotesk font-semibold text-[10px] text-mute mt-[5px] tracking-[.04em]">
          {sub}
        </div>
      </div>
      <div className="font-anton italic text-[24px] leading-[0.8] text-cyan pl-[6px] border-l border-[var(--border)]">
        {odd}
      </div>
    </div>
  );
}
