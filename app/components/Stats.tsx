const STATS = [
  { n: "24", em: "", l: "manches de Coupe du Monde par saison" },
  { n: "180", em: "+", l: "athlètes suivis en temps réel" },
  { n: "12", em: "K", l: "parieurs actifs dans la communauté" },
  { n: "100", em: "%", l: "gratuit, sans carte ni dépôt" },
];

export default function Stats() {
  return (
    <section className="border-b border-[var(--border)] bg-deep">
      <div className="wrap grid grid-cols-2 min-[761px]:grid-cols-4 gap-x-[22px] gap-y-7 min-[761px]:gap-6 py-8">
        {STATS.map((s, i) => (
          <div key={i} className="reveal relative flex flex-col gap-[7px] pl-[18px]">
            <span
              className="absolute left-0 top-1 bottom-1 w-[3px] rounded-[3px]"
              style={{ background: "linear-gradient(#28D7E6,#1F73FF)" }}
            />
            <div className="font-anton italic text-[40px] leading-[0.85] text-white tracking-[.01em]">
              {s.n}
              {s.em && <em className="text-cyan not-italic">{s.em}</em>}
            </div>
            <div className="font-archivo font-semibold text-[12.5px] leading-[1.35] text-soft">
              {s.l}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
