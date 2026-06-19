"use client";

import { useState, useMemo } from "react";

type Resultat = {
  id: string;
  rang: number | null;
  code_bateau: string;
  categorie: string;
  temps_secondes: number | null;
  points: number | null;
  dsq: boolean | null;
  coureur1_nom: string | null;
  coureur1_prenom: string | null;
  coureur1_club: string | null;
  coureur2_nom: string | null;
  coureur2_prenom: string | null;
};

type Course = {
  id: string;
  code_course: number;
  libelle: string;
  nb_participants: number;
  synced_at: string | null;
  resultats: Resultat[];
};

type Competition = {
  id: string;
  code_ffck: number;
  nom: string;
  ville: string | null;
  riviere: string | null;
  date_debut: string;
  code_niveau: string;
  est_national: boolean;
  courses: Course[];
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

function athleteName(r: Resultat): string {
  const nom1 = [r.coureur1_prenom, r.coureur1_nom].filter(Boolean).join(" ");
  if (!r.coureur2_nom) return nom1 || r.code_bateau;
  const nom2 = [r.coureur2_prenom, r.coureur2_nom].filter(Boolean).join(" ");
  return `${nom1} / ${nom2}`;
}

export default function CompetitionDetail({ competition }: { competition: Competition }) {
  const [activeCourse, setActiveCourse] = useState(competition.courses[0]?.id ?? "");
  const [catFilter, setCatFilter] = useState("Toutes");

  const course = competition.courses.find((c) => c.id === activeCourse);

  const categories = useMemo(() => {
    if (!course) return [];
    return ["Toutes", ...Array.from(new Set(course.resultats.map((r) => r.categorie))).sort()];
  }, [course]);

  const filtered = useMemo(() => {
    if (!course) return [];
    const list = catFilter === "Toutes"
      ? course.resultats
      : course.resultats.filter((r) => r.categorie === catFilter);
    return [...list].sort((a, b) => {
      if (a.dsq && !b.dsq) return 1;
      if (!a.dsq && b.dsq) return -1;
      return (a.rang ?? 999) - (b.rang ?? 999);
    });
  }, [course, catFilter]);

  return (
    <div>
      {/* Fil d'ariane */}
      <a href="/admin/data" className="font-archivo text-[13px] text-[#7c9aaa] hover:text-white transition-colors">
        ← Données FFCK
      </a>

      {/* Header */}
      <div className="mt-5 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className={`font-grotesk font-bold text-[9.5px] tracking-[.1em] uppercase border rounded-[5px] px-[7px] py-[3px] ${NIVEAU_STYLE[competition.code_niveau] ?? NIVEAU_STYLE.INR}`}>
            {competition.code_niveau}
          </span>
          <span className="font-mono text-[11px] text-[#5c7c8c]">{competition.code_ffck}</span>
        </div>
        <h1 className="font-anton italic uppercase text-white text-[28px] leading-[0.95]">
          {competition.nom}
        </h1>
        <p className="font-archivo text-[13.5px] text-[#7c9aaa] mt-2 flex items-center gap-3 flex-wrap">
          {competition.ville && <span>{competition.ville}</span>}
          {competition.riviere && <span>· {competition.riviere}</span>}
          <span>·</span>
          <span>
            {new Date(competition.date_debut).toLocaleDateString("fr-FR", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </span>
        </p>
      </div>

      {/* Tabs courses */}
      {competition.courses.length > 1 && (
        <div className="flex gap-2 mb-5">
          {competition.courses.map((c) => (
            <button
              key={c.id}
              onClick={() => { setActiveCourse(c.id); setCatFilter("Toutes"); }}
              className={`font-archivo font-bold text-[13px] px-4 py-2 rounded-[10px] transition-colors ${
                activeCourse === c.id
                  ? "bg-[rgba(40,215,230,.12)] text-[#28D7E6] border border-[rgba(40,215,230,.3)]"
                  : "text-[#7c9aaa] hover:text-white hover:bg-white/5"
              }`}
            >
              {c.libelle}
              <span className="ml-1.5 font-grotesk font-bold text-[9px] tracking-[.06em]">
                ({c.nb_participants})
              </span>
            </button>
          ))}
        </div>
      )}

      {!course ? (
        <div className="text-center py-12 font-archivo text-[14px] text-[#5c7c8c]">
          Aucune course disponible.
        </div>
      ) : course.synced_at === null ? (
        <div className="text-center py-12 border border-dashed border-[var(--border-2)] rounded-[16px]">
          <p className="font-archivo text-[14px] text-[#5c7c8c]">Résultats non synchronisés.</p>
          <p className="font-archivo text-[12.5px] text-[#3c5a6a] mt-1">
            Lance la sync résultats depuis <a href="/admin/data" className="text-[#28D7E6] hover:underline">Données FFCK</a>.
          </p>
        </div>
      ) : (
        <>
          {/* Filtre catégorie */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="font-grotesk font-bold text-[9px] tracking-[.14em] uppercase text-[#5c7c8c]">
              Catégorie :
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCatFilter(cat)}
                  className={`font-grotesk font-bold text-[9.5px] tracking-[.06em] uppercase px-[8px] py-[4px] rounded-[5px] border transition-colors ${
                    catFilter === cat
                      ? "text-[#28D7E6] bg-[rgba(40,215,230,.12)] border-[rgba(40,215,230,.3)]"
                      : "text-[#5c7c8c] bg-transparent border-[var(--border-2)] hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <span className="font-archivo text-[12.5px] text-[#5c7c8c] ml-auto">
              {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Table résultats */}
          <div className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[18px] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[3rem_1fr_1fr_5rem_6rem_5rem] gap-3 px-5 py-3 border-b border-[var(--border-2)]">
              {["Rang", "Athlète", "Club", "Catégorie", "Temps", "Points"].map((h) => (
                <span key={h} className="font-grotesk font-bold text-[9px] tracking-[.14em] uppercase text-[#5c7c8c]">
                  {h}
                </span>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="px-5 py-10 text-center font-archivo text-[13.5px] text-[#5c7c8c]">
                Aucun résultat.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {filtered.map((r) => (
                  <div
                    key={r.id}
                    className={`grid grid-cols-[3rem_1fr_1fr_5rem_6rem_5rem] gap-3 px-5 py-3 transition-colors ${
                      r.dsq
                        ? "opacity-40 hover:bg-[rgba(255,255,255,.02)]"
                        : "hover:bg-[rgba(255,255,255,.03)]"
                    }`}
                  >
                    <div className="font-anton italic text-[20px] text-[#28D7E6] leading-tight self-center">
                      {r.dsq ? <span className="text-[#FF7A45] text-[11px] font-archivo font-bold not-italic">DSQ</span> : (r.rang ?? "—")}
                    </div>
                    <div className="self-center min-w-0">
                      <div className="font-archivo font-extrabold text-[13px] text-white truncate">
                        {athleteName(r)}
                      </div>
                      <div className="font-mono text-[9px] text-[#5c7c8c] mt-0.5">{r.code_bateau}</div>
                    </div>
                    <div className="font-archivo text-[12px] text-[#7c9aaa] self-center leading-snug">
                      {r.coureur1_club ?? "—"}
                    </div>
                    <div className="self-center">
                      <span className="font-grotesk font-bold text-[9px] tracking-[.06em] uppercase text-[#9fbac6] bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-[4px] px-[6px] py-[3px]">
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
            )}
          </div>
        </>
      )}
    </div>
  );
}
