const STEPS = [
  {
    num: "01",
    title: "Crée ton compte",
    body: "Inscription gratuite en 30 secondes. 1 000 crédits offerts, sans carte ni dépôt.",
  },
  {
    num: "02",
    title: "Choisis ta compétition",
    body: "Parcours le calendrier mondial et repère les athlètes sur lesquels tu veux miser.",
  },
  {
    num: "03",
    title: "Place ton pari",
    body: "Valide ton coupon et suis la descente en live. Les gains tombent à l'arrivée.",
  },
];

export default function Steps() {
  return (
    <section
      className="py-[60px] min-[881px]:py-[84px] bg-surface border-t border-b border-[var(--border)]"
      id="how"
    >
      <div className="wrap">
        <span className="eyebrow reveal">
          <span className="tick" /> Comment ça marche
        </span>
        <h2 className="sec-title reveal">Sur l'eau en 3 étapes</h2>
        <div className="grid grid-cols-1 min-[881px]:grid-cols-3 gap-5 min-[881px]:gap-6 mt-12">
          {STEPS.map((s, i) => (
            <div key={i} className="reveal relative pt-4">
              {i < STEPS.length - 1 && (
                <div
                  className="hidden min-[881px]:block absolute top-8 left-[60px] right-[-12px] h-[2px]"
                  style={{
                    background:
                      "repeating-linear-gradient(90deg,var(--border-2) 0 6px,transparent 6px 12px)",
                  }}
                />
              )}
              <div
                className="font-anton italic text-[58px] leading-[0.8] tracking-[.02em] text-transparent"
                style={{ WebkitTextStroke: "1.5px var(--border-2)" }}
              >
                {s.num}
              </div>
              <h3 className="font-archivo font-extrabold text-[19px] leading-[1.15] text-white mt-[14px]">
                {s.title}
              </h3>
              <p className="text-[14.5px] leading-[1.6] text-soft mt-[9px] max-w-[300px]">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
