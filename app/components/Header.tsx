"use client";

import { useState } from "react";
import Logo from "./Logo";
import { useToast } from "./Toast";

const NAV = [
  { href: "#features", label: "Pourquoi" },
  { href: "#how", label: "Comment ça marche" },
  { href: "#event", label: "Compétitions" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const toast = useToast();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-[14px] bg-[rgba(7,31,45,.78)] border-b border-[var(--border)]">
      <div className="wrap flex items-center justify-between h-[72px]">
        <a href="#top" aria-label="Kayakbet">
          <Logo id="head" />
        </a>

        <nav className="hidden min-[881px]:flex items-center gap-8">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="nav-link">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden min-[881px]:flex items-center gap-[14px]">
          <span
            className="font-archivo font-bold text-[14px] text-white px-[6px] py-[11px] cursor-pointer hover:text-cyan"
            onClick={() => toast("Connexion — démo")}
          >
            Connexion
          </span>
          <a className="btn btn-primary" href="#cta">
            Créer mon compte
          </a>
        </div>

        <button
          className={`burger ${open ? "open" : ""} min-[881px]:hidden flex flex-col gap-[5px] bg-none border-0 cursor-pointer p-2`}
          aria-label="Menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {open && (
        <div className="min-[881px]:hidden flex flex-col gap-1 px-8 pb-[22px] pt-2 border-b border-[var(--border)] bg-[rgba(7,31,45,.96)]">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="font-archivo font-bold text-[16px] text-soft py-[14px] border-b border-[var(--border)]"
              onClick={() => setOpen(false)}
            >
              {n.label}
            </a>
          ))}
          <div className="flex flex-col gap-[11px] mt-[18px]">
            <a
              className="btn btn-primary"
              href="#cta"
              onClick={() => setOpen(false)}
            >
              Créer mon compte
            </a>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setOpen(false);
                toast("Connexion — démo");
              }}
            >
              Connexion
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
