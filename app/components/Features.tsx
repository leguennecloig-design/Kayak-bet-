const FEATURES = [
  {
    title: "Suis le circuit mondial",
    body: "Coupe du Monde, Championnats, slalom et descente : toutes les épreuves, en direct et à venir, au même endroit.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8.6" stroke="#28D7E6" strokeWidth="1.8" />
        <path
          d="M3.5 12h17M12 3.4c2.4 2.3 3.7 5.4 3.7 8.6S14.4 18.3 12 20.6c-2.4-2.3-3.7-5.4-3.7-8.6S9.6 5.7 12 3.4Z"
          stroke="#28D7E6"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    title: "Parie en un geste",
    body: "Compose ton coupon, choisis ta mise en crédits, et suis ton gain potentiel se calculer en temps réel.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M4 8.4A1.9 1.9 0 0 1 5.9 6.5h12.2A1.9 1.9 0 0 1 20 8.4a1.9 1.9 0 0 0 0 3.8 1.9 1.9 0 0 1-1.9 1.9H5.9A1.9 1.9 0 0 1 4 12.2a1.9 1.9 0 0 0 0-3.8Z"
          stroke="#28D7E6"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M13.6 6.9v8"
          stroke="#28D7E6"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="1.4 2.6"
        />
      </svg>
    ),
  },
  {
    title: "Grimpe au classement",
    body: "Affronte la communauté chaque saison, gagne des crédits et vise le sommet du leaderboard Kayakbet.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M5 20V11.5M12 20V4.5M19 20v-6"
          stroke="#28D7E6"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M3.5 20.2h17"
          stroke="#28D7E6"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function Features() {
  return (
    <section className="py-16 min-[881px]:py-[92px] bg-deep" id="features">
      <div className="wrap">
        <span className="eyebrow reveal">
          <span className="tick" /> Pourquoi Kayakbet
        </span>
        <h2 className="sec-title reveal">Le pari, version eaux vives</h2>
        <p className="sec-sub reveal">
          Toute l'adrénaline des paris sportifs, appliquée au plus
          spectaculaire des sports d'eau — et 100% sans argent réel.
        </p>
        <div className="grid grid-cols-1 min-[881px]:grid-cols-3 gap-5 mt-12">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="reveal group bg-surface border border-[var(--border)] rounded-[20px] px-[26px] py-7 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:shadow-soft hover:border-[var(--border-2)]"
            >
              <div
                className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center border border-[var(--border)] [&_svg]:w-[25px] [&_svg]:h-[25px]"
                style={{
                  background:
                    "linear-gradient(150deg,rgba(40,215,230,.18),rgba(31,115,255,.12))",
                }}
              >
                {f.icon}
              </div>
              <h3 className="font-archivo font-extrabold text-[20px] leading-[1.1] tracking-[-.01em] text-white mt-5">
                {f.title}
              </h3>
              <p className="text-[14.5px] leading-[1.6] text-soft mt-[10px]">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
