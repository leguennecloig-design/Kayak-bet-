"use client";

import { useState } from "react";
import ManualCreationClient from "./ManualCreationClient";
import ImportCotesFileClient from "./ImportCotesFileClient";
import ImportCotesQualifFileClient from "./ImportCotesQualifFileClient";
import InscriptionsClient from "../../inscriptions/InscriptionsClient";

type Mode = "ffck" | "manuel" | "cotes" | "qualif" | null;

export default function NouvelleCompetitionClient() {
  const [mode, setMode] = useState<Mode>(null);

  if (mode === "manuel") {
    return <ManualCreationClient onBack={() => setMode(null)} />;
  }

  if (mode === "cotes") {
    return <ImportCotesFileClient onBack={() => setMode(null)} />;
  }

  if (mode === "qualif") {
    return <ImportCotesQualifFileClient onBack={() => setMode(null)} />;
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
          onClick={() => setMode("cotes")}
          className="text-left bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] hover:border-[rgba(40,215,230,.4)] rounded-[18px] p-6 transition-colors group sm:col-span-2"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-cyan mb-4">
            <path d="M4 19V5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M14 3v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <p className="font-archivo font-extrabold text-[16px] text-white group-hover:text-cyan transition-colors">
            Import cotes précalculées (.txt)
          </p>
          <p className="font-archivo text-[12.5px] text-[#7c9aaa] mt-2 leading-relaxed">
            La liste de départ ET les cotes (Top1/Top3/Top5/Top10) ont déjà été
            calculées ailleurs — importe le fichier .txt directement, sans repasser
            par l&apos;algo interne.
          </p>
        </button>

        <button
          onClick={() => setMode("qualif")}
          className="text-left bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] hover:border-[rgba(40,215,230,.4)] rounded-[18px] p-6 transition-colors group sm:col-span-2"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-cyan mb-4">
            <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="font-archivo font-extrabold text-[16px] text-white group-hover:text-cyan transition-colors">
            Compétition qualif → finale (.txt)
          </p>
          <p className="font-archivo text-[12.5px] text-[#7c9aaa] mt-2 leading-relaxed">
            Manche de qualification avant une finale séparée — un seul marché de
            pari : la cote de passage en finale (quota fixe par catégorie), déjà
            calculée ailleurs. Pas de Top1/3/5/10 ni place/temps exact.
          </p>
        </button>

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
