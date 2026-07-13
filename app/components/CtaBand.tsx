"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="w-5 h-5 flex-none">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 1 0 24 44c11 0 20-8 20-20 0-1.3-.1-2.3-.4-3.5Z"/>
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 0 0 6.3 14.7Z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44Z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.3 36 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5Z"/>
  </svg>
);

export default function CtaBand() {
  const ferroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!ferroRef.current) return;
    let handle: { destroy: () => void } | null = null;
    let cancelled = false;

    // Monte le WebGL seulement quand la section approche du viewport : au
    // chargement, Hero/FeaturedEvent/CtaBand créeraient sinon 3 contextes
    // WebGL simultanés dès le premier paint, ce qui peut dépasser le budget
    // GPU de Safari mobile et faire perdre le contexte (blob qui reste noir).
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || cancelled) return;
        io.disconnect();
        import("./ferrofluid").then(({ mountFerrofluid }) => {
          if (cancelled || !ferroRef.current) return;
          try {
            handle = mountFerrofluid(ferroRef.current, {
              colors: ["#0A2A3D", "#1F73FF", "#28D7E6", "#11C2C2"],
              flowDirection: "right",
              speed: 0.32,
              scale: 1.15,
              opacity: 0.75,
              turbulence: 0.7,
              fluidity: 0.16,
              rimWidth: 0.22,
              sharpness: 3,
              shimmer: 0.8,
              glow: 1.6,
              mouseInteraction: false,
            });
          } catch (e) {
            console.error("Ferrofluid failed to mount", e);
          }
        });
      },
      { rootMargin: "300px" }
    );
    io.observe(ferroRef.current);

    return () => { cancelled = true; io.disconnect(); handle?.destroy(); };
  }, []);

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
          <div ref={ferroRef} className="ferro-wrap ferro-corner" />
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
            <a className="btn btn-primary w-full min-[561px]:w-auto" href="/login?mode=signup">
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
            Aucune carte requise · crédits fictifs
          </div>
        </div>
      </div>
    </section>
  );
}
