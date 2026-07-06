import Logo from "./Logo";

const COLS = [
  {
    h: "Produit",
    links: [
      { t: "Pourquoi Kayakbet", href: "#features" },
      { t: "Comment ça marche", href: "#how" },
      { t: "Compétitions", href: "#event" },
      { t: "Classement", href: "#cta" },
    ],
  },
  {
    h: "Disciplines",
    links: [
      { t: "Slalom", href: "#" },
      { t: "Descente", href: "#" },
      { t: "Kayak-cross", href: "#" },
      { t: "Coupe du Monde", href: "#" },
    ],
  },
  {
    h: "À propos",
    links: [
      { t: "L'équipe", href: "#" },
      { t: "Jeu responsable", href: "#" },
      { t: "Conditions", href: "#" },
      { t: "Contact", href: "#" },
    ],
  },
];

const SOCIALS = [
  {
    label: "X",
    path: <path d="M4 4l16 16M20 4 4 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  },
  {
    label: "Instagram",
    path: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
      </>
    ),
  },
  {
    label: "YouTube",
    path: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10.5 9.5v5l4-2.5-4-2.5Z" fill="currentColor" />
      </>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="bg-[#061A26] border-t border-[var(--border)] pt-[58px] pb-8">
      <div className="wrap">
        <div className="grid grid-cols-2 min-[821px]:grid-cols-[1.4fr_1fr_1fr_1fr] gap-x-6 gap-y-9 min-[821px]:gap-[34px]">
          <div className="col-span-2 min-[821px]:col-span-1">
            <a href="#top" className="inline-block mb-4">
              <Logo id="foot" />
            </a>
            <p className="text-[14px] leading-[1.65] text-soft max-w-[280px] m-0">
              Les paris sportifs en eaux vives. Suis le courant, joue la cote —
              100% gratuit, 100% sensations.
            </p>
            <div className="flex gap-[10px] mt-5">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="w-[38px] h-[38px] rounded-[11px] border border-[var(--border)] flex items-center justify-center text-soft transition-[border-color,color,transform] hover:border-[var(--cyan)] hover:text-cyan hover:-translate-y-[2px]"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]">
                    {s.path}
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {COLS.map((c) => (
            <div key={c.h}>
              <h4 className="font-grotesk font-bold text-[11px] leading-none tracking-[.16em] uppercase text-mute mt-[6px] mb-[18px]">
                {c.h}
              </h4>
              {c.links.map((l) => (
                <a
                  key={l.t}
                  href={l.href}
                  className="block font-archivo font-semibold text-[14px] leading-none text-soft mb-[13px] transition-colors hover:text-cyan"
                >
                  {l.t}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-11 pt-6 border-t border-[var(--border)] flex items-center justify-between gap-[18px] flex-wrap">
          <p className="font-archivo font-medium text-[12.5px] leading-[1.6] text-mute m-0">
            © 2026 Kayakbet · Jeu gratuit à crédits fictifs, sans valeur
            monétaire et sans gain réel.
          </p>
          <span className="font-grotesk font-extrabold text-[12px] leading-none text-coral border-[1.5px] border-coral rounded-[8px] px-[9px] py-[6px] tracking-[.04em]">
            18+ · Jeu responsable
          </span>
        </div>
      </div>
    </footer>
  );
}
