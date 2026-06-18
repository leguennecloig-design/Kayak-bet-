"use client";

import { useEffect, useState } from "react";

const TARGET = new Date("2026-07-16T10:00:00");
const pad = (n: number) => String(n).padStart(2, "0");

const ODDS = [
  { nm: "D. Tostain",  pays: "FR", note: "France",           val: "1.65", fav: false },
  { nm: "N. Zerouga",  pays: "FR", note: "France",           val: "2.87", fav: false },
  { nm: "L. Fontaine", pays: "FR", note: "France · Favorite", val: "1.32", fav: true  },
  { nm: "E. Lacoste",  pays: "FR", note: "France",           val: "1.96", fav: false },
];

export default function FeaturedEvent() {
  const [cd, setCd] = useState({ d: "—", h: "—", m: "—", s: "—" });

  useEffect(() => {
    const tick = () => {
      let diff = Math.max(0, TARGET.getTime() - Date.now());
      const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5);  diff -= h * 36e5;
      const m = Math.floor(diff / 6e4);   diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      setCd({ d: pad(d), h: pad(h), m: pad(m), s: pad(s) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="py-[62px] min-[881px]:py-[92px] bg-deep" id="event">
      <div className="wrap">
        <span className="eyebrow reveal">
          <span className="tick" /> À la une
        </span>
        <h2 className="sec-title reveal">La prochaine descente</h2>

        <div
          className="reveal relative mt-11 rounded-[26px] overflow-hidden border border-[var(--border-2)] shadow-soft"
          style={{ background: "radial-gradient(130% 160% at 90% -20%, #11405C, #0A2A3D 60%)" }}
        >
          {/* Glow */}
          <div
            className="absolute right-[-80px] top-[-100px] w-[400px] h-[400px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(40,215,230,.18), transparent 68%)" }}
          />

          {/* Water SVG */}
          <svg
            className="absolute left-0 right-0 bottom-[-2px] h-[120px] opacity-50 pointer-events-none"
            viewBox="0 0 1120 120"
            preserveAspectRatio="none"
            fill="none"
          >
            <path d="M0 64c140 0 140-28 280-28s140 28 280 28 140-28 280-28 140 28 280 28v56H0Z" fill="#0E3A52" opacity=".6" />
            <path d="M0 80c140 0 140-20 280-20s140 20 280 20 140-20 280-20 140 20 280 20v40H0Z" fill="#11C2C2" opacity=".1" />
          </svg>

          <div className="relative z-[1] px-[22px] pt-[28px] pb-[32px] min-[881px]:px-[40px] min-[881px]:pt-[36px] min-[881px]:pb-[38px]">

            {/* Top row */}
            <div className="flex flex-col min-[881px]:flex-row items-start justify-between gap-6 mb-7">
              <div className="flex-1 min-w-0">
                {/* Badge */}
                <span className="inline-flex items-center gap-[7px] font-grotesk font-bold text-[10.5px] leading-none tracking-[.12em] uppercase text-cyan bg-[rgba(40,215,230,.1)] border border-[rgba(40,215,230,.3)] rounded-[9px] px-3 py-[8px]">
                  <svg viewBox="0 0 24 24" fill="none" className="w-[11px] h-[11px] flex-none">
                    <path d="M13 2 4 13.5h6.2L9 22l10-12.2h-6.3L14 2Z" fill="#FF7A45" />
                  </svg>
                  Prochaine grande compétition · 16 juillet 2026
                </span>

                {/* Title */}
                <h3 className="font-anton italic uppercase text-white text-[28px] min-[881px]:text-[42px] leading-[0.92] my-[14px]">
                  Championnats de France<br />de Descente
                </h3>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-x-[18px] gap-y-[8px] text-[#9FBAC6] font-archivo font-semibold text-[13px]">
                  <span className="flex items-center gap-[7px]">
                    <svg viewBox="0 0 24 24" fill="none" className="w-[15px] h-[15px] flex-none">
                      <path d="M12 21s6.5-5 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 16 12 21 12 21Z" stroke="#28D7E6" strokeWidth="1.7" strokeLinejoin="round" />
                      <circle cx="12" cy="10.6" r="2.2" stroke="#28D7E6" strokeWidth="1.7" />
                    </svg>
                    La Plagne
                    <span className="font-grotesk font-bold text-[8px] bg-[rgba(255,255,255,.1)] rounded-[4px] px-[5px] py-[3px] text-[#bcd2db] tracking-[.04em] uppercase">FR</span>
                  </span>
                  <span className="flex items-center gap-[7px]">
                    <svg viewBox="0 0 24 24" fill="none" className="w-[15px] h-[15px] flex-none">
                      <path d="M8.5 3.5 12 9l3.5-5.5" stroke="#28D7E6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="14.5" r="5.2" stroke="#28D7E6" strokeWidth="1.7" />
                    </svg>
                    Toutes catégories
                  </span>
                  <span className="flex items-center gap-[7px]">
                    <svg viewBox="0 0 24 24" fill="none" className="w-[15px] h-[15px] flex-none">
                      <circle cx="9" cy="8.5" r="3" stroke="#28D7E6" strokeWidth="1.7" />
                      <path d="M3.5 19c0-3 2.5-4.6 5.5-4.6s5.5 1.6 5.5 4.6" stroke="#28D7E6" strokeWidth="1.7" strokeLinecap="round" />
                      <path d="M16 5.4a3 3 0 0 1 0 6M17.5 14.6c2.4.4 4 2 4 4.4" stroke="#28D7E6" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                    2 480 parieurs engagés
                  </span>
                </div>
              </div>

              {/* Countdown */}
              <div className="flex gap-[8px] flex-none">
                {[{ n: cd.d, l: "Jours" }, { n: cd.h, l: "Heures" }, { n: cd.m, l: "Min" }, { n: cd.s, l: "Sec" }].map(({ n, l }) => (
                  <div
                    key={l}
                    className="text-center bg-[rgba(7,31,45,.55)] border border-[var(--border-2)] rounded-[13px] px-[10px] pt-[13px] pb-[10px] min-w-[62px]"
                  >
                    <div className="font-anton italic text-[32px] leading-[0.85] text-cyan tabular-nums">{n}</div>
                    <div className="font-grotesk font-bold text-[7.5px] leading-[1.3] tracking-[.12em] uppercase text-[#7C9AAA] mt-[7px]">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider + label */}
            <div className="flex items-center gap-3 mb-[14px]">
              <span className="w-6 h-[3px] rounded-full bg-cyan flex-none" />
              <span className="font-grotesk font-bold text-[10.5px] tracking-[.16em] uppercase text-[#7C9AAA]">
                Vainqueur — Classement général
              </span>
            </div>

            {/* Odds grid + CTA overlay */}
            <div className="relative">
              <div className="grid grid-cols-2 min-[881px]:grid-cols-4 gap-[11px]">
                {ODDS.map((o) => (
                  <div
                    key={o.nm}
                    className="relative flex items-center justify-between gap-[10px] bg-[rgba(255,255,255,.04)] border border-[var(--border-2)] rounded-[14px] px-[14px] py-[14px]"
                  >
                    {o.fav && (
                      <span className="absolute -top-[7px] left-[12px] font-grotesk font-bold text-[7.5px] leading-none tracking-[.08em] text-navy bg-cyan rounded-[5px] px-[6px] py-[3.5px]">
                        FAVORI
                      </span>
                    )}
                    <div>
                      <div className="font-archivo font-extrabold text-[13.5px] leading-[1.1] text-white">{o.nm}</div>
                      <div className="font-archivo text-[11px] text-[#6a8a9a] mt-[5px]">{o.note}</div>
                    </div>
                    <div className="font-anton italic text-[24px] leading-[0.82] text-cyan flex-none">{o.val}</div>
                  </div>
                ))}
              </div>

              {/* Overlay CTA — incite à créer un compte */}
              <a
                href="/login"
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[16px] backdrop-blur-[3px] bg-[rgba(7,20,30,.55)] transition-opacity hover:bg-[rgba(7,20,30,.45)]"
              >
                <span className="font-grotesk font-bold text-[10px] tracking-[.14em] uppercase text-cyan">
                  Connecte-toi pour parier
                </span>
                <span className="inline-flex items-center gap-2 bg-gradient-to-r from-[#28D7E6] to-[#11C2C2] text-[#0A2A3D] font-archivo font-bold text-[13px] px-5 py-[11px] rounded-[10px] shadow-[0_8px_22px_-8px_rgba(40,215,230,.6)]">
                  Créer mon compte gratuit
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                    <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </a>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
