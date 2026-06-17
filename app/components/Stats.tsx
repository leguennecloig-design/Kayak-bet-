const STATS = [
  { value: "100%", label: "Gratuit" },
  { value: "0€", label: "Dépôt requis" },
  { value: "∞", label: "Crédits fictifs" },
];

export default function Stats() {
  return (
    <section className="border-b border-[var(--border)] bg-deep">
      <div className="wrap py-10 flex flex-col min-[561px]:flex-row items-center justify-center gap-0 divide-y min-[561px]:divide-y-0 min-[561px]:divide-x divide-[var(--border)]">
        {STATS.map((s, i) => (
          <div
            key={i}
            className="reveal flex items-center gap-4 px-10 py-4 min-[561px]:py-2"
          >
            <span className="font-anton italic text-[38px] leading-none text-cyan">
              {s.value}
            </span>
            <span className="font-archivo font-semibold text-[14px] text-soft uppercase tracking-[.06em]">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
