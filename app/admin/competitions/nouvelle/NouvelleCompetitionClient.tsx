"use client";

import { useState } from "react";
import ManualCreationClient from "./ManualCreationClient";
import InscriptionsClient from "../../inscriptions/InscriptionsClient";

type Mode = "ffck" | "manuel" | null;

export default function NouvelleCompetitionClient() {
  const [mode, setMode] = useState<Mode>(null);

  if (mode === "manuel") {
    return <ManualCreationClient onBack={() => setMode(null)} />;
  }

  if (mode === "ffck") {
    return (
      <div>
        <button
          onClick={() => setMode(null)}
          className="font-archivo text-[13px] text-[#7c9aaa] hover:text-white transition-colors mb-6"
        >
          ← Choisir un autre mode
        </button>
        <InscriptionsClient />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-anton italic uppercase text-white text-[36px] leading-[0.9]">
          Création<br />
          <span className="text-cyan">compétition</span>
        </h1>
        <p className="text-[#7c9aaa] font-archivo text-[13px] mt-3 leading-relaxed">
          Choisis comment créer la compétition.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setMode("ffck")}
          className="text-left bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] hover:border-[rgba(40,215,230,.4)] rounded-[18px] p-6 transition-colors group"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-cyan mb-4">
            <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 9A8 8 0 0 0 5.3 5.3M4 15a8 8 0 0 0 14.7 3.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="font-archivo font-extrabold text-[16px] text-white group-hover:text-cyan transition-colors">
            Inscriptions FFCK
          </p>
          <p className="font-archivo text-[12.5px] text-[#7c9aaa] mt-2 leading-relaxed">
            Scanner compet.ffck.org et importer directement les partants d&apos;une
            compétition Descente déjà ouverte aux inscriptions.
          </p>
        </button>

        <button
          onClick={() => setMode("manuel")}
          className="text-left bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] hover:border-[rgba(40,215,230,.4)] rounded-[18px] p-6 transition-colors group"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-cyan mb-4">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              stroke="currentColor"
            />
          </svg>
          <p className="font-archivo font-extrabold text-[16px] text-white group-hover:text-cyan transition-colors">
            Création manuelle
          </p>
          <p className="font-archivo text-[12.5px] text-[#7c9aaa] mt-2 leading-relaxed">
            Importer un PDF ou TXT de liste de départ competFFCK — la
            compétition et les catégories sont créées automatiquement.
          </p>
        </button>
      </div>
    </div>
  );
}
