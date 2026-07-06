"use client";

import { useEffect, useState } from "react";

const STYLES = ["soft", "spring", "drift"] as const;
type Style = typeof STYLES[number];
const LABELS: Record<Style, string> = { soft: "Sobre", spring: "Dynamique", drift: "Flottement" };

export default function AnimSwitch() {
  const [active, setActive] = useState<Style>("spring");

  useEffect(() => {
    const saved = localStorage.getItem("kb-hero-anim") as Style | null;
    const style: Style = saved && STYLES.includes(saved) ? saved : "spring";
    setActive(style);
    document.body.setAttribute("data-anim-style", style);
  }, []);

  function pick(s: Style) {
    setActive(s);
    localStorage.setItem("kb-hero-anim", s);
    document.body.setAttribute("data-anim-style", s);
    document.body.classList.remove("play");
    void document.body.offsetWidth;
    document.body.classList.add("play");
    window.dispatchEvent(new Event("kb:replay-hero"));
  }

  return (
    <div className="anim-switch">
      {STYLES.map((s) => (
        <button key={s} className={active === s ? "on" : ""} onClick={() => pick(s)}>
          {LABELS[s]}
        </button>
      ))}
    </div>
  );
}
