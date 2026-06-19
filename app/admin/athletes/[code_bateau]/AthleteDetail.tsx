"use client";

import { useState, useMemo } from "react";

type Resultat = {
  id: string;
  rang: number | null;
  categorie: string;
  temps_secondes: number | null;
  points: number | null;
  dsq: boolean | null;
  course: {
    id: string;
    libelle: string;
    competition: {
      id: string;
      nom: string;
      date_debut: string;
      code_niveau: string;
      ville: string | null;
    };
  } | null;
};

type AthleteInfo = {
  rang: number;
  nom_prenom: string;
  club: string;
  code_bateau: string;
  points: number;
  nb_courses: number;
  categorie: string;
  label: string;
};

const NIVEAU_STYLE: Record<string, string> = {
  NAT: "text-[#28D7E6] bg-[rgba(40,215,230,.12)] border-[rgba(40,215,230,.3)]",
  REG: "text-[#9fbac6] bg-[rgba(255,255,255,.06)] border-[rgba(255,255,255,.1)]",
  INR: "text-[#7c9aaa] bg-[rgba(255,255,255,.04)] border-[rgba(255,255,255,.07)]",
};

function formatTime(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(3).padStart(6, "0");
  return m > 0 ? `${m}:${s}` : `${s}s`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function AthleteDetail({
  athlete,
  resultats,
}: {
  athlete: AthleteInfo;
  resultats: Resultat[];
}) {
  const [filter, setFilter] = useState<"all" | "nat" | "reg">("all");

  // Grouper par compétition, triés par date DESC
  const byCompetition = useMemo(() => {
    const filtered = resultats.filter((r) => {
      if (!r.course?.competition) return false;
      if (filter === "nat") return r.course.competition.code_niveau === "NAT";
      if (filter === "reg") return r.course.competition.code_niveau !== "NAT";
      return true;
    });

    const map = new Map<string, { comp: Resultat["course"] & { competition: NonNullable<NonNullable<Resultat["course"]>["competition"]> }; results: Resultat[] }>();
    for (const r of filtered) {
      if (!r.course?.competition) continue;
      const key = r.course.competition.id;
      if (!map.has(key)) {
        map.set(key, {
          comp: r.course as typeof map extends Map<string, { comp: infer C }> ? C : never,
          results: [],
        });
      }
      map.get(key)!.results.push(r);
    }

    return [...map.values()].sort(
      (a, b) =>
        new Date(b.comp.competition.date_debut).getTime() -
        new Date(a.comp.competition.date_debut).getTime()
    );
  }, [resultats, filter]);

  const totalResultats = resultats.filter((r) => r.course?.competition).length;

  return (
    <div>
      {/* Fil d'ariane */}
      <a href="/admin/athletes" className="font-archivo text-[13px] text-[#7c9aaa] hover:text-white transition-colors">
        ← Athlètes
      </a>

      {/* Header */}
      <div className="mt-5 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-grotesk font-bold text-[9.5px] tracking-[.1em] uppercase text-[#28D7E6] bg-[rgba(40,215,230,.12)] border border-[rgba(40,215,230,.3)] rounded-[5px] px-[7px] py-[3px]">
            {athlete.categorie}
          </span>
          <span className="font-mono text-[11px] text-[#5c7c8c]">{athlete.code_bateau}</span>
        </div>
        <h1 className="font-anton italic uppercase text-white text-[32px] leading-[0.95]">
          {athlete.nom_prenom}
        </h1>
        <p className="font-archivo text-[13.5px] text-[#7c9aaa] mt-1.5">
          {athlete.club} · {athlete.label}
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Rang national", value: `#${athlete.rang}`, accent: true },
          { label: "Points classement", value: athlete.points % 1 === 0 ? String(athlete.points) : athlete.points.toFixed(2) },
          { label: "Courses classement", value: String(athlete.nb_courses) },
        ].map(({ label, value, accent }) => (
          <div key={label} className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[14px] p-4">
            <div className="font-grotesk font-bold text-[9px] tracking-[.14em] uppercase text-[#5c7c8c] mb-1">
              {label}
            </div>
            <div className={`font-anton italic text-[26px] leading-tight ${accent ? "text-[#28D7E6]" : "text-white"}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Section résultats */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-archivo font-extrabold text-[16px] text-white">
            Historique FFCK
          </h2>
          <p className="font-archivo text-[12.5px] text-[#5c7c8c] mt-0.5">
            {totalResultats} résultat{totalResultats !== 1 ? "s" : ""} en base
          </p>
        </div>

        {totalResultats > 0 && (
          <div className="flex gap-1.5">
            {(["all", "nat", "reg"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`font-grotesk font-bold text-[9.5px] tracking-[.06em] uppercase px-3 py-[5px] rounded-[6px] border transition-colors ${
                  filter === f
                    ? "text-[#28D7E6] bg-[rgba(40,215,230,.12)] border-[rgba(40,215,230,.3)]"
                    : "text-[#5c7c8c] bg-transparent border-[var(--border-2)] hover:text-white"
                }`}
              >
                {f === "all" ? "Tous" : f === "nat" ? "Nationaux" : "Régionaux"}
              </button>
            ))}
          </div>
        )}
      </div>

      {totalResultats === 0 ? (
        <div className="text-center py-16 border border-dashed border-[var(--border-2)] rounded-[18px]">
          <p className="font-archivo text-[14px] text-[#5c7c8c]">Aucun résultat synchronisé pour cet athlète.</p>
          <p className="font-archivo text-[12.5px] text-[#3c5a6a] mt-1.5">
            Lance la sync résultats depuis <a href="/admin/data" className="text-[#28D7E6] hover:underline">Données FFCK</a>.
          </p>
        </div>
      ) : byCompetition.length === 0 ? (
        <div className="text-center py-10 font-archivo text-[13.5px] text-[#5c7c8c]">
          Aucun résultat pour ce filtre.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {byCompetition.map(({ comp, results }) => (
            <div
              key={comp.competition.id}
              className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[18px] overflow-hidden"
            >
              {/* Competition header */}
              <a
                href={`/admin/data/competitions/${comp.competition.id}`}
                className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-2)] hover:bg-[rgba(255,255,255,.03)] transition-colors group"
              >
                <span className={`font-grotesk font-bold text-[9px] tracking-[.1em] uppercase border rounded-[5px] px-[6px] py-[3px] flex-none ${NIVEAU_STYLE[comp.competition.code_niveau] ?? NIVEAU_STYLE.INR}`}>
                  {comp.competition.code_niveau}
                </span>
                <span className="font-archivo font-extrabold text-[13.5px] text-white group-hover:text-[#28D7E6] transition-colors flex-1 min-w-0 truncate">
                  {comp.competition.nom}
                </span>
                <span className="font-archivo text-[12px] text-[#5c7c8c] flex-none">
                  {formatDate(comp.competition.date_debut)}
                </span>
                <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-[#5c7c8c] group-hover:text-[#28D7E6] transition-colors flex-none">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>

              {/* Résultats */}
              <div className="divide-y divide-[var(--border)]">
                {results.map((r) => (
                  <div
                    key={r.id}
                    className={`grid grid-cols-[4rem_1fr_5rem_6rem_5rem] gap-4 px-5 py-3.5 ${r.dsq ? "opacity-40" : ""}`}
                  >
                    <div className="font-anton italic text-[22px] text-[#28D7E6] leading-tight self-center">
                      {r.dsq ? (
                        <span className="text-[#FF7A45] text-[10.5px] font-archivo font-bold not-italic">DSQ</span>
                      ) : (r.rang ?? "—")}
                    </div>
                    <div className="font-archivo text-[12.5px] text-[#9fbac6] self-center">
                      {r.course?.libelle ?? "Course"}
                    </div>
                    <div className="self-center">
                      <span className="font-grotesk font-bold text-[8.5px] tracking-[.06em] uppercase text-[#7c9aaa] bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-[4px] px-[5px] py-[3px]">
                        {r.categorie}
                      </span>
                    </div>
                    <div className="font-mono text-[13px] text-white self-center">
                      {formatTime(r.temps_secondes)}
                    </div>
                    <div className="font-archivo font-bold text-[13px] text-[#9fbac6] self-center">
                      {r.points != null ? r.points.toFixed(2) : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
