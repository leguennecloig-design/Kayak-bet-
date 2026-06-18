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

export default function CtaBand() {
  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

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
          <div className="relative z-[1] mt-[18px] font-grotesk font-semibold text-[12px] leading-none text-mute tracking-[.03em]">
            Aucune carte requise · crédits fictifs · réservé aux 18 ans et +
          </div>
        </div>
      </div>
    </section>
  );
}
