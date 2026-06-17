export default function Stats() {
  return (
    <section className="border-b border-[var(--border)] bg-deep">
      <div className="wrap flex justify-center py-8">
        <div className="reveal inline-flex items-center gap-3 bg-surface border border-[var(--border-2)] rounded-2xl px-7 py-4">
          <span className="font-anton italic text-[34px] leading-none text-cyan">
            100%
          </span>
          <span className="font-archivo font-bold text-[16px] text-white">
            gratuit
          </span>
        </div>
      </div>
    </section>
  );
}