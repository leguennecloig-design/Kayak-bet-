"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

type Athlete = {
  rang: number;
  nom_prenom: string;
  club: string;
  code_bateau: string;
  points: number;
  nb_courses: number;
};

export default function AthletesClient({
  selectedCat,
  athletes,
  categories,
  labels,
}: {
  selectedCat: string;
  athletes: Athlete[];
  categories: string[];
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return athletes;
    const q = search.toLowerCase();
    return athletes.filter(
      (a) =>
        a.nom_prenom.toLowerCase().includes(q) ||
        a.club.toLowerCase().includes(q)
    );
  }, [athletes, search]);

  function changeCategory(cat: string) {
    setSearch("");
    router.push(`/admin/athletes?cat=${cat}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-anton italic uppercase text-white text-[36px] leading-[0.9]">
            Athlètes 2026
          </h1>
          <p className="font-archivo text-[14px] text-[#7c9aaa] mt-2">
            Base officielle FFCK — {categories.length} catégories
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <select
            value={selectedCat}
            onChange={(e) => changeCategory(e.target.value)}
            className="w-full bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-[11px] px-4 py-3 text-white font-archivo text-[13.5px] outline-none focus:border-[rgba(40,215,230,.5)] appearance-none pr-8"
          >
            {categories.map((c) => (
              <option key={c} value={c} className="bg-[#0a2a3d]">
                {c} — {labels[c] ?? c}
              </option>
            ))}
          </select>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6a7a] pointer-events-none"
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6a7a] pointer-events-none"
          >
            <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher un athlète ou club…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-[11px] pl-10 pr-4 py-3 text-white font-archivo text-[13.5px] placeholder:text-[#4a6a7a] outline-none focus:border-[rgba(40,215,230,.5)] focus:bg-[rgba(40,215,230,.04)] transition-colors"
          />
        </div>
      </div>

      {/* Category badge + count */}
      <div className="flex items-center gap-2 mb-4">
        <span className="font-grotesk font-bold text-[9.5px] tracking-[.14em] uppercase text-[#28D7E6] bg-[rgba(40,215,230,.12)] border border-[rgba(40,215,230,.3)] rounded-[5px] px-[7px] py-[3px]">
          {selectedCat}
        </span>
        <span className="font-archivo text-[14px] text-[#9fbac6]">
          {labels[selectedCat] ?? selectedCat}
        </span>
        <span className="font-archivo text-[13px] text-[#5c7c8c] ml-auto">
          {filtered.length} athlète{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[18px] overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[3.5rem_1fr_1fr_5.5rem_5rem] gap-4 px-5 py-3 border-b border-[var(--border-2)]">
          {["Rang", "Athlète", "Club", "Points", "Courses"].map((h) => (
            <span
              key={h}
              className="font-grotesk font-bold text-[9px] tracking-[.14em] uppercase text-[#5c7c8c]"
            >
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center font-archivo text-[13.5px] text-[#5c7c8c]">
            Aucun athlète trouvé.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((a) => (
              <a
                key={a.code_bateau}
                href={`/admin/athletes/${encodeURIComponent(a.code_bateau)}`}
                className="grid grid-cols-[3.5rem_1fr_1fr_5.5rem_5rem] gap-4 px-5 py-3.5 hover:bg-[rgba(40,215,230,.04)] hover:border-l-2 hover:border-l-[rgba(40,215,230,.4)] transition-colors group"
              >
                <div className="font-anton italic text-[20px] text-[#28D7E6] leading-tight self-center">
                  {a.rang}
                </div>
                <div className="self-center">
                  <div className="font-archivo font-extrabold text-[13.5px] text-white group-hover:text-[#28D7E6] transition-colors">
                    {a.nom_prenom}
                  </div>
                  <div className="font-grotesk font-bold text-[9px] tracking-[.06em] text-[#5c7c8c] mt-0.5">
                    {a.code_bateau}
                  </div>
                </div>
                <div className="font-archivo text-[12.5px] text-[#7c9aaa] self-center leading-snug">
                  {a.club}
                </div>
                <div className="font-archivo font-bold text-[13px] text-white self-center">
                  {a.points % 1 === 0 ? a.points : a.points.toFixed(2)}
                </div>
                <div className="font-archivo text-[13px] text-[#7c9aaa] self-center">
                  {a.nb_courses}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
