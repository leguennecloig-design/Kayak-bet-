"use client";

import { useEffect, useRef } from "react";

export default function Stats() {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const panel = panelRef.current;
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
    <section className="border-b border-[var(--border)] bg-deep relative overflow-hidden">
      <div className="wrap py-11 flex items-center justify-center">
        <div ref={panelRef} className="trust-panel reveal" id="trustPanel">
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
