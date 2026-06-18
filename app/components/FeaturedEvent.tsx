const ODDS = [
  { nm: "D. Tostain",  ct: "FR", v: "1.65", fav: false },
  { nm: "N. Zerouga",  ct: "FR", v: "1.98", fav: false },
  { nm: "A. Reboul", v: "1.32", fav: true  },
  { nm: "E. Lacoste",  ct: "FR", v: "1.96", fav: false },
];

const Water = () => (
  <svg
    className="absolute left-0 right-0 bottom-[-2px] h-[130px] opacity-50 pointer-events-none"
    viewBox="0 0 1120 130"
    preserveAspectRatio="none"
    fill="none"
  >
    <path
      d="M0 70c140 0 140-30 280-30s140 30 280 30 140-30 280-30 140 30 280 30v60H0Z"
      fill="#0E3A52"
      opacity=".6"
    />
    <path
      d="M0 86c140 0 140-22 280-22s140 22 280 22 140-22 280-22 140 22 280 22v44H0Z"
      fill="#11C2C2"
      opacity=".1"
    />
  </svg>
);

export default function FeaturedEvent() {
  return (
    <section className="py-[62px] min-[881px]:py-[92px] bg-deep" id="event">
      <div className="wrap">
        <span className="eyebrow reveal">
          <span className="tick" /> À la une
        </span>
        <h2 className="sec-title reveal">La prochaine descente</h2>

        <div
          className="reveal relative mt-11 rounded-[24px] overflow-hidden border border-[var(--border-2)] shadow-soft px-[22px] py-[26px] min-[881px]:px-[38px] min-[881px]:py-9"
          style={{
            background:
              "radial-gradient(130% 160% at 90% -20%, #11405C, #0A2A3D 60%)",
          }}
        >
          <Water />

          <div className="relative z-[1] flex flex-col min-[881px]:flex-row items-start justify-between gap-[22px]">
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-2 font-grotesk font-bold text-[11px] leading-none tracking-[.12em] uppercase text-cyan bg-[rgba(40,215,230,.1)] border border-[rgba(40,215,230,.32)] rounded-[9px] px-3 py-2">
                <span className="w-[13px] h-[13px]">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M13 2 4 13.5h6.2L9 22l10-12.2h-6.3L14 2Z" fill="#FF7A45" />
                  </svg>
                </span>
                En approche · 16 juillet 2026
              </span>
              <h3 className="font-anton italic uppercase text-white text-[30px] min-[881px]:text-[38px] leading-[0.94] my-4">
                Championnats de France de Descente
              </h3>
              <div className="flex items-center gap-[18px] flex-wrap text-[#9FBAC6] font-archivo font-semibold text-[13px]">
                <span className="flex items-center gap-[7px]">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                    <path
                      d="M12 21s6.5-5 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 16 12 21 12 21Z"
                      stroke="#28D7E6"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="10.6" r="2.2" stroke="#28D7E6" strokeWidth="1.7" />
                  </svg>
                  La Plagne
                  <span className="font-grotesk font-bold text-[9px] bg-[rgba(255,255,255,.1)] rounded-[4px] px-[5px] py-[3px] text-[#bcd2db] tracking-[.04em]">
                    FR
                  </span>
                </span>
                <span className="flex items-center gap-[7px]">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                    <path
                      d="M8.5 3.5 12 9l3.5-5.5"
                      stroke="#28D7E6"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="14.5" r="5.2" stroke="#28D7E6" strokeWidth="1.7" />
                  </svg>
                  Toutes catégories
                </span>
              </div>
            </div>

            <div className="flex-none text-center bg-[rgba(7,31,45,.5)] border border-[var(--border-2)] rounded-[14px] px-5 py-[13px] min-w-[104px]">
              <div className="font-anton italic text-[36px] leading-[0.85] text-cyan">
                29
              </div>
              <div className="font-grotesk font-bold text-[8px] leading-[1.3] tracking-[.13em] uppercase text-[#7C9AAA] mt-[7px]">
                jours avant
                <br />
                le départ
              </div>
            </div>
          </div>

          <div className="relative z-[1] grid grid-cols-2 min-[881px]:grid-cols-4 gap-[11px] mt-6">
            {ODDS.map((o, i) => (
              <div
                key={i}
                className="relative flex items-center justify-between gap-[10px] cursor-pointer bg-[rgba(255,255,255,.04)] border border-[var(--border-2)] rounded-[13px] px-[14px] py-[13px] transition-[border-color,background,transform] hover:border-[rgba(40,215,230,.5)] hover:bg-[rgba(40,215,230,.08)] hover:-translate-y-[2px]"
              >
                {o.fav && (
                  <span className="absolute -top-[7px] left-[13px] font-grotesk font-bold text-[8px] leading-none tracking-[.08em] text-navy bg-cyan rounded-[5px] px-[6px] py-[3px]">
                    FAVORI
                  </span>
                )}
                <div>
                  <div className="font-archivo font-extrabold text-[13px] leading-[1.1] text-white">
                    {o.nm}
                  </div>
                  <span className="font-grotesk font-bold text-[8px] leading-none bg-[rgba(255,255,255,.1)] rounded-[4px] px-[5px] py-[3px] text-[#bcd2db] uppercase mt-[7px] inline-block">
                    {o.ct}
                  </span>
                </div>
                <div className="font-anton italic text-[22px] leading-[0.82] text-cyan">
                  {o.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
