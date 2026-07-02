export default function Stats() {
  return (
    <section className="border-b border-[var(--border)] bg-deep relative overflow-hidden">
      <div className="wrap py-11 flex items-center justify-center">
        <div className="trust-panel reveal" id="trustPanel">
          <div className="trust">
            <span className="tn">100%</span>
            <span className="tl">Gratuit</span>
          </div>
          <div className="trust">
            <span className="tn">0€</span>
            <span className="tl">Dépôt requis</span>
          </div>
          <div className="trust">
            <span className="tn">∞</span>
            <span className="tl">Crédits fictifs</span>
          </div>
        </div>
      </div>
    </section>
  );
}
