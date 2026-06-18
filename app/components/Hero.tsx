"use client";

import { createClient } from "@/lib/supabase";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 flex-none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function Hero() {
  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

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
            Pronostiquez sur le circuit mondial de kayak de descente. Crédits fictifs, zéro risque, sensations garanties.
          </p>

          <div className="flex flex-col min-[561px]:flex-row gap-[13px] mt-[34px] flex-wrap">
            <a className="btn btn-primary w-full min-[561px]:w-auto" href="/login">
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
              className="btn btn-google w-full min-[561px]:w-auto"
              onClick={signInWithGoogle}
            >
              <GoogleIcon />
              Continuer avec Google
            </button>
          </div>

          <p className="mt-4 font-archivo font-semibold text-[13.5px] leading-[1.5] text-mute">
            Déjà membre ?{" "}
            <a className="text-cyan font-bold cursor-pointer" href="/login">
              Connexion
            </a>
          </p>
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
              <linearGradient id="bd" x1="34" y1="8" x2="196" y2="240" gradientUnits="userSpaceOnUse">
                <stop stopColor="#28D7E6" />
                <stop offset="1" stopColor="#1F73FF" />
              </linearGradient>
            </defs>
          </svg>

          <OddsFloat
            cls="top-[30px] right-[-8px] min-[561px]:right-[-8px] animate-bob-a"
            initials="DT"
            name="Dimitri Tostain"
            sub="FRANCE · K1"
            odd="1.65"
          />
          <OddsFloat
            cls="bottom-[42px] left-[-16px] animate-bob-b"
            initials="CF"
            name="Charles Ferrion"
            sub="FRANCE · C1"
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
