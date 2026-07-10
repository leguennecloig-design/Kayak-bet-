"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="w-[18px] h-[18px] flex-none">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 1 0 24 44c11 0 20-8 20-20 0-1.3-.1-2.3-.4-3.5Z"/>
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 0 0 6.3 14.7Z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44Z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.3 36 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5Z"/>
  </svg>
);

export default function Hero() {
  const ferroWrapRef = useRef<HTMLDivElement>(null);
  const trustPanelRef = useRef<HTMLDivElement>(null);

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  // ---- ferrofluid ambient blob ----
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!ferroWrapRef.current) return;
    let handle: { destroy: () => void } | null = null;
    let cancelled = false;
    import("./ferrofluid").then(({ mountFerrofluid }) => {
      if (cancelled || !ferroWrapRef.current) return;
      try {
        handle = mountFerrofluid(ferroWrapRef.current, {
          colors: ["#0A2A3D", "#1F73FF", "#28D7E6", "#11C2C2"],
          flowDirection: "up",
          speed: 0.35,
          scale: 1.3,
          opacity: 0.9,
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
    return () => { cancelled = true; handle?.destroy(); };
  }, []);

  // Le H1 n'anime plus lettre par lettre : sur iOS Safari/PWA, "Anton" n'a
  // pas de vraie graisse italique (Google Fonts ne fournit que le style
  // normal) — `font-style: italic` y est donc toujours un italique
  // synthétique (le moteur incline les glyphes lui-même). Combiner cette
  // inclinaison synthétique avec une animation par caractère (chaque lettre
  // découpée et transformée individuellement par GSAP SplitText) faisait
  // apparaître un rendu dédoublé/fantôme sur iOS, y compris après avoir
  // essayé d'attendre le chargement des fonts. Un simple fondu du bloc
  // entier (CSS ci-dessous, pas de découpage par lettre) est le rendu le
  // plus robuste possible dans ce cas précis.

  // ---- chiffres du bandeau de confiance, lettre par lettre à l'entrée ----
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const panel = trustPanelRef.current;
    if (!panel) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          const nums = Array.from(panel.querySelectorAll<HTMLElement>(".tn"));
          if (!nums.length) return;
          Promise.all([document.fonts.ready, import("gsap"), import("gsap/SplitText")]).then(
            ([, { gsap }, { SplitText }]) => {
              gsap.registerPlugin(SplitText);
              nums.forEach((el, i) => {
                const split = new SplitText(el, { type: "chars", smartWrap: true });
                gsap.fromTo(
                  split.chars,
                  { opacity: 0, y: 22, scale: 0.6 },
                  { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(2.2)", stagger: 0.035, delay: i * 0.08 }
                );
              });
            }
          );
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(panel);
    return () => io.disconnect();
  }, []);

  return (
    <section
      className="overflow-hidden border-b border-[var(--border)] relative"
      style={{ background: "radial-gradient(120% 130% at 88% -12%, #12435F, #0A2A3D 56%)" }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute", width: 520, height: 520, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(40,215,230,.16), transparent 68%)",
        top: "-14%", right: "-6%", filter: "blur(6px)", pointerEvents: "none",
      }} />

      {/* Background waves */}
      <svg style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 220, opacity: .5, pointerEvents: "none", width: "100%" }}
        viewBox="0 0 1180 220" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path d="M-20 150c160 0 160-46 320-46s160 46 320 46 160-46 340-46 160 46 300 46" stroke="rgba(40,215,230,.14)" strokeWidth="2" fill="none" />
        <path d="M-20 182c160 0 160-40 320-40s160 40 320 40 160-40 340-40 160 40 300 40" stroke="rgba(40,215,230,.09)" strokeWidth="2" fill="none" />
        <path d="M-20 210c160 0 160-34 320-34s160 34 320 34 160-34 340-34 160 34 300 34" stroke="rgba(40,215,230,.05)" strokeWidth="2" fill="none" />
      </svg>

      <div className="wrap grid grid-cols-1 min-[921px]:grid-cols-[1.05fr_.95fr] gap-[14px] min-[921px]:gap-[48px] items-center py-[52px_60px] min-[921px]:py-[80px_92px]">

        {/* Copy */}
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="tick" /> Paris sportifs · 100% gratuit
          </span>
          <h1 className="font-anton italic uppercase text-white mt-6 text-[60px] min-[561px]:text-[74px] min-[921px]:text-[96px] leading-[0.84] tracking-[.005em]">
            Ride the<br /><span className="text-cyan">rankings.</span>
          </h1>
          <p className="lede text-[18.5px] leading-[1.65] text-soft max-w-[476px] mt-[26px]">
            Pronostiquez sur le circuit mondial de kayak de descente. Crédits fictifs, zéro risque, sensations garanties.
          </p>
          <div className="hero-cta flex flex-col min-[561px]:flex-row gap-[13px] mt-9 flex-wrap">
            <a className="btn btn-primary w-full min-[561px]:w-auto" href="/login">
              Créer mon compte gratuit
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <button className="btn btn-google w-full min-[561px]:w-auto" onClick={signInWithGoogle}>
              <GoogleIcon />
              Continuer avec Google
            </button>
          </div>
          <p className="hero-alt mt-[18px] font-archivo font-semibold text-[13.5px] leading-[1.5] text-mute">
            Déjà membre ?{" "}
            <a className="text-cyan font-bold cursor-pointer" href="/login">Connexion</a>
          </p>

          <div ref={trustPanelRef} className="hero-stats" id="trustPanel">
            <div className="hstat">
              <span className="ic">
                <svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
              </span>
              <span className="tx"><span className="tn">100%</span><span className="tl">Gratuit</span></span>
            </div>
            <div className="hstat">
              <span className="ic">
                <svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /><path d="M5 4l14 16" /></svg>
              </span>
              <span className="tx"><span className="tn">0€</span><span className="tl">Dépôt requis</span></span>
            </div>
            <div className="hstat">
              <span className="ic">
                <svg viewBox="0 0 24 24"><path d="M6.5 9a3.5 3.5 0 1 0 0 6c2.5 0 4-3 5.5-3s3 3 5.5 3a3.5 3.5 0 1 0 0-6c-2.5 0-4 3-5.5 3S9 9 6.5 9z" /></svg>
              </span>
              <span className="tx"><span className="tn">∞</span><span className="tl">Crédits fictifs</span></span>
            </div>
          </div>
        </div>

        {/* Visual */}
        <div className="hero-vis relative flex items-center justify-center min-h-[340px] min-[921px]:min-h-[440px] order-first min-[921px]:order-none" aria-hidden="true">
          <div ref={ferroWrapRef} className="ferro-wrap" />
          <span className="ring r3 absolute rounded-full border-[1.5px] border-[rgba(40,215,230,.22)] w-[584px] h-[584px] opacity-[.55] hidden min-[921px]:block" />
          <span className="ring r2 absolute rounded-full border-[1.5px] border-[rgba(40,215,230,.22)] w-[456px] h-[456px]" />
          <span className="ring r1 absolute rounded-full border-[1.5px] border-[rgba(40,215,230,.22)] w-[340px] h-[340px]" />
          <div className="bigdrop-glow" />
          <svg
            className="bigdrop relative"
            viewBox="0 0 230 262"
            fill="none"
            style={{
              width: 222, height: 254,
              filter: "drop-shadow(0 34px 60px rgba(31,115,255,.5))",
            }}
          >
            <path d="M115 8C68 73 34 113 34 156a81 81 0 0 0 162 0C196 113 162 73 115 8Z" fill="url(#bd)" />
            <path d="M64 168c18 0 18 16 36 16s18-16 36-16 18 16 36 16" stroke="#fff" strokeWidth="8" fill="none" strokeLinecap="round" opacity=".95" />
            <path d="M70 196c15 0 15 13 30 13s15-13 30-13" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" opacity=".6" />
            <defs>
              <linearGradient id="bd" x1="34" y1="8" x2="196" y2="240" gradientUnits="userSpaceOnUse">
                <stop stopColor="#28D7E6" /><stop offset="1" stopColor="#1F73FF" />
              </linearGradient>
            </defs>
          </svg>

          <OddsFloat
            cls="odds-float a absolute top-[24px] right-[-8px]"
            initials="DT" name="Dimitri Tostain" sub="FRANCE · K1" odd="1.65"
          />
          <OddsFloat
            cls="odds-float b absolute bottom-[38px] left-[-16px]"
            initials="CF" name="Charles Ferrion" sub="FRANCE · C1" odd="1.39"
            avBg="linear-gradient(140deg,#11C2C2,#1F73FF)"
          />
        </div>
      </div>
    </section>
  );
}

function OddsFloat({ cls, initials, name, sub, odd, avBg = "linear-gradient(140deg,#28D7E6,#1F73FF)" }: {
  cls: string; initials: string; name: string; sub: string; odd: string; avBg?: string;
}) {
  return (
    <div
      className={`${cls} bg-[var(--surface)] border border-[var(--border-2)] rounded-2xl px-[15px] py-[13px] flex items-center gap-3`}
      style={{ background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.015)),var(--surface)", backdropFilter: "blur(6px)", boxShadow: "var(--shadow-lg)" }}
    >
      <div className="w-[38px] h-[38px] rounded-[10px] flex-none flex items-center justify-center" style={{ background: avBg }}>
        <b className="font-archivo font-extrabold text-[14px] text-white">{initials}</b>
      </div>
      <div>
        <div className="font-archivo font-extrabold text-[13px] text-white">{name}</div>
        <div className="font-grotesk font-semibold text-[10px] text-mute mt-[5px] tracking-[.04em]">{sub}</div>
      </div>
      <div className="font-anton italic text-[24px] leading-[0.8] text-cyan pl-[6px] border-l border-[var(--border)]">{odd}</div>
    </div>
  );
}
