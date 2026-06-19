"use client";

import { useState, useCallback } from "react";

type Course = {
  id: string;
  code_course: string;
  libelle: string | null;
  nb_participants: number | null;
  cotes_count: number;
};

type Competition = {
  id: string;
  nom: string;
  date_debut: string | null;
  code_niveau: string | null;
  code_type: string | null;
  nb_courses: number | null;
  courses: Course[];
};

type CoteRow = {
  id: string;
  code_bateau: string;
  nom: string | null;
  categorie: string;
  nb_athletes_startlist: number;
  rang_national: number | null;
  force_score: number | null;
  rang_espere: number | null;
  cote_top1: number | null;
  cote_top3: number | null;
  cote_top5: number | null;
  cote_top10: number | null;
  cote_top20: number | null;
  cote_exact_place: number | null;
  cote_exact_time: number | null;
  calculated_at: string | null;
  algo_version: string | null;
};

const NIVEAU_STYLE: Record<string, string> = {
  NAT: "text-[#28D7E6] bg-[rgba(40,215,230,.12)] border-[rgba(40,215,230,.3)]",
  REG: "text-[#a0f0a0] bg-[rgba(160,240,160,.10)] border-[rgba(160,240,160,.3)]",
  SEF: "text-[#FF7A45] bg-[rgba(255,122,69,.12)] border-[rgba(255,122,69,.3)]",
};

function fmt(v: number | null, dec = 2): string {
  return v == null ? "—" : v.toFixed(dec);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function CotesClient({
  competitions,
}: {
  competitions: Competition[];
}) {
  const [selectedCompId, setSelectedCompId] = useState<string>(
    competitions[0]?.id ?? ""
  );
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    competitions[0]?.courses[0]?.id ?? ""
  );
  const [selectedCat, setSelectedCat] = useState<string>("Tous");
  const [cotes, setCotes] = useState<CoteRow[]>([]);
  const [loadingCotes, setLoadingCotes] = useState(false);
  const [recalcState, setRecalcState] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [recalcAllState, setRecalcAllState] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [courseCotesCounts, setCourseCotesCounts] = useState<
    Record<string, number>
  >(() => {
    const map: Record<string, number> = {};
    for (const c of competitions) {
      for (const course of c.courses) {
        map[course.id] = course.cotes_count;
      }
    }
    return map;
  });

  const selectedComp =
    competitions.find((c) => c.id === selectedCompId) ?? competitions[0];

  const fetchCotes = useCallback(
    async (courseId: string, cat = "Tous") => {
      if (!courseId) return;
      setLoadingCotes(true);
      setCotes([]);
      setSelectedCat(cat);
      try {
        const url =
          cat !== "Tous"
            ? `/api/cotes/${courseId}?categorie=${encodeURIComponent(cat)}`
            : `/api/cotes/${courseId}`;
        const res = await fetch(url);
        const data = await res.json();
        setCotes(data);
      } catch {
        setCotes([]);
      } finally {
        setLoadingCotes(false);
      }
    },
    []
  );

  function selectComp(compId: string) {
    setSelectedCompId(compId);
    const comp = competitions.find((c) => c.id === compId);
    const firstCourse = comp?.courses[0];
    const cId = firstCourse?.id ?? "";
    setSelectedCourseId(cId);
    setSelectedCat("Tous");
    setCotes([]);
    if (cId) fetchCotes(cId, "Tous");
  }

  function selectCourse(courseId: string) {
    setSelectedCourseId(courseId);
    setSelectedCat("Tous");
    fetchCotes(courseId, "Tous");
  }

  async function recalculate(courseId: string) {
    setRecalcState("loading");
    try {
      const res = await fetch("/api/admin/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      const total = json.results?.[courseId]?.total ?? 0;
      setCourseCotesCounts((prev) => ({ ...prev, [courseId]: total }));
      setRecalcState("ok");
      await fetchCotes(courseId, selectedCat);
      setTimeout(() => setRecalcState("idle"), 3000);
    } catch {
      setRecalcState("error");
      setTimeout(() => setRecalcState("idle"), 3000);
    }
  }

  async function recalcAll() {
    setRecalcAllState("loading");
    try {
      const res = await fetch("/api/admin/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      const newCounts: Record<string, number> = {};
      for (const [cId, info] of Object.entries(
        json.results as Record<string, { total: number }>
      )) {
        newCounts[cId] = info.total;
      }
      setCourseCotesCounts((prev) => ({ ...prev, ...newCounts }));
      setRecalcAllState("ok");
      if (selectedCourseId) await fetchCotes(selectedCourseId, selectedCat);
      setTimeout(() => setRecalcAllState("idle"), 4000);
    } catch {
      setRecalcAllState("error");
      setTimeout(() => setRecalcAllState("idle"), 4000);
    }
  }

  const allCats =
    cotes.length > 0
      ? ["Tous", ...Array.from(new Set(cotes.map((c) => c.categorie))).sort()]
      : ["Tous"];

  const displayedCotes =
    selectedCat !== "Tous"
      ? cotes.filter((c) => c.categorie === selectedCat)
      : cotes;

  const badge = selectedComp?.code_type ?? selectedComp?.code_niveau ?? "";
  const badgeStyle =
    NIVEAU_STYLE[badge] ??
    "text-[#7c9aaa] bg-[rgba(124,154,170,.1)] border-[rgba(124,154,170,.3)]";

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="font-anton italic uppercase text-white text-[36px] leading-[0.9]">
            Cotes
          </h1>
          <p className="font-archivo text-[14px] text-[#7c9aaa] mt-2">
            Calcul algorithmique — Bradley-Terry + Distribution Normale
          </p>
        </div>
        <button
          onClick={recalcAll}
          disabled={recalcAllState === "loading"}
          className="inline-flex items-center gap-2 bg-[rgba(255,122,69,.12)] border border-[rgba(255,122,69,.4)] text-[#FF7A45] font-archivo font-bold text-[12px] px-4 py-2.5 rounded-[10px] hover:bg-[rgba(255,122,69,.2)] transition-colors disabled:opacity-50"
        >
          {recalcAllState === "loading" ? (
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
            </svg>
          ) : recalcAllState === "ok" ? (
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
              <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20 9A8 8 0 0 0 5.3 5.3M4 15a8 8 0 0 0 14.7 3.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          Recalculer tout
        </button>
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-6">
        {/* Sidebar: liste compétitions */}
        <div className="flex flex-col gap-1.5">
          <p className="font-grotesk font-bold text-[9px] tracking-[.16em] uppercase text-[#5c7c8c] px-1 mb-1">
            Compétitions
          </p>
          {competitions.map((c) => {
            const b = c.code_type ?? c.code_niveau ?? "";
            const bStyle =
              NIVEAU_STYLE[b] ??
              "text-[#7c9aaa] bg-[rgba(124,154,170,.1)] border-[rgba(124,154,170,.3)]";
            const total = c.courses.reduce(
              (acc, cr) => acc + (courseCotesCounts[cr.id] ?? cr.cotes_count),
              0
            );
            return (
              <button
                key={c.id}
                onClick={() => selectComp(c.id)}
                className={`text-left px-4 py-3 rounded-[12px] border transition-colors ${
                  c.id === selectedCompId
                    ? "border-[rgba(40,215,230,.5)] bg-[rgba(40,215,230,.06)]"
                    : "border-[var(--border-2)] hover:border-[rgba(40,215,230,.3)] hover:bg-white/[.02]"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`font-grotesk font-bold text-[8.5px] tracking-[.1em] uppercase border rounded-[4px] px-[6px] py-[2px] ${bStyle}`}
                  >
                    {b}
                  </span>
                  {total > 0 && (
                    <span className="font-grotesk text-[9px] text-[#28D7E6]">
                      {total} cotes
                    </span>
                  )}
                </div>
                <div className="font-archivo font-semibold text-[12px] text-white leading-tight">
                  {c.nom}
                </div>
                {c.date_debut && (
                  <div className="font-archivo text-[11px] text-[#5c7c8c] mt-0.5">
                    {fmtDate(c.date_debut)}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <div>
          {selectedComp && (
            <>
              {/* Comp header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span
                    className={`font-grotesk font-bold text-[9px] tracking-[.12em] uppercase border rounded-[5px] px-[7px] py-[3px] ${badgeStyle}`}
                  >
                    {badge}
                  </span>
                  <h2 className="font-archivo font-extrabold text-[18px] text-white">
                    {selectedComp.nom}
                  </h2>
                </div>
              </div>

              {/* Course tabs */}
              {selectedComp.courses.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 mb-5 flex-wrap">
                    {selectedComp.courses.map((course) => {
                      const count =
                        courseCotesCounts[course.id] ?? course.cotes_count;
                      return (
                        <button
                          key={course.id}
                          onClick={() => selectCourse(course.id)}
                          className={`font-archivo font-semibold text-[12px] px-4 py-2 rounded-[9px] border transition-colors ${
                            course.id === selectedCourseId
                              ? "border-[rgba(40,215,230,.5)] bg-[rgba(40,215,230,.08)] text-[#28D7E6]"
                              : "border-[var(--border-2)] text-[#7c9aaa] hover:border-[rgba(40,215,230,.3)] hover:text-white"
                          }`}
                        >
                          {course.code_course}
                          {count > 0 && (
                            <span className="ml-1.5 text-[10px] opacity-70">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {/* Recalculate course button */}
                    {selectedCourseId && (
                      <button
                        onClick={() => recalculate(selectedCourseId)}
                        disabled={recalcState === "loading"}
                        className="ml-auto inline-flex items-center gap-1.5 font-archivo font-semibold text-[11px] text-[#FF7A45] border border-[rgba(255,122,69,.3)] px-3 py-2 rounded-[9px] hover:bg-[rgba(255,122,69,.1)] transition-colors disabled:opacity-50"
                      >
                        {recalcState === "loading" ? (
                          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                          </svg>
                        ) : recalcState === "ok" ? (
                          <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3">
                            <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M20 9A8 8 0 0 0 5.3 5.3M4 15a8 8 0 0 0 14.7 3.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        )}
                        Recalculer
                      </button>
                    )}
                  </div>

                  {/* Category filter */}
                  {allCats.length > 1 && (
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {allCats.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedCat(cat);
                            fetchCotes(selectedCourseId, cat);
                          }}
                          className={`font-grotesk font-bold text-[10px] tracking-[.08em] uppercase px-3 py-1.5 rounded-[7px] border transition-colors ${
                            cat === selectedCat
                              ? "border-[rgba(40,215,230,.5)] bg-[rgba(40,215,230,.08)] text-[#28D7E6]"
                              : "border-[var(--border-2)] text-[#5c7c8c] hover:text-white hover:border-[rgba(40,215,230,.2)]"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Cotes table */}
                  {loadingCotes ? (
                    <div className="flex items-center gap-3 py-12 text-[#5c7c8c] font-archivo text-[13px]">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                      </svg>
                      Calcul en cours…
                    </div>
                  ) : displayedCotes.length === 0 ? (
                    <div className="text-center py-14 border border-dashed border-[var(--border-2)] rounded-2xl">
                      <p className="font-archivo text-[13px] text-[#5c7c8c]">
                        Aucune cote calculée pour cette manche.
                      </p>
                      <p className="font-archivo text-[12px] text-[#3a5c6c] mt-1">
                        Clique sur "Recalculer" pour générer les cotes.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full font-archivo text-[12px]">
                        <thead>
                          <tr className="border-b border-[var(--border-2)]">
                            {["#", "Athlète", "Cat.", "Rang nat.", "Force", "Espéré", "Top 1", "Top 3", "Top 5", "Top 10", "Top 20"].map(
                              (h) => (
                                <th
                                  key={h}
                                  className="px-3 py-2.5 text-left font-grotesk font-bold text-[9.5px] tracking-[.1em] uppercase text-[#5c7c8c]"
                                >
                                  {h}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {displayedCotes.map((row, i) => (
                            <tr
                              key={row.id}
                              className="border-b border-[var(--border-2)] hover:bg-white/[.015] transition-colors"
                            >
                              <td className="px-3 py-3 text-[#5c7c8c] font-semibold">
                                {i + 1}
                              </td>
                              <td className="px-3 py-3">
                                <span className="font-semibold text-white">
                                  {row.nom ?? row.code_bateau}
                                </span>
                                <span className="ml-2 text-[10px] text-[#5c7c8c]">
                                  {row.code_bateau}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-[#7c9aaa]">
                                {row.categorie}
                              </td>
                              <td className="px-3 py-3 text-[#7c9aaa]">
                                {row.rang_national ?? "—"}
                              </td>
                              <td className="px-3 py-3 text-[#5c7c8c]">
                                {fmt(row.force_score, 3)}
                              </td>
                              <td className="px-3 py-3 text-[#5c7c8c]">
                                {fmt(row.rang_espere, 1)}
                              </td>
                              <CoteCell v={row.cote_top1} />
                              <CoteCell v={row.cote_top3} />
                              <CoteCell v={row.cote_top5} />
                              <CoteCell v={row.cote_top10} />
                              <CoteCell v={row.cote_top20} />
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {displayedCotes[0]?.calculated_at && (
                        <p className="font-archivo text-[11px] text-[#3a5c6c] mt-3 text-right">
                          Calculé le{" "}
                          {fmtDate(displayedCotes[0].calculated_at)} —{" "}
                          algo {displayedCotes[0].algo_version}
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 border border-dashed border-[var(--border-2)] rounded-2xl">
                  <p className="font-archivo text-[13px] text-[#5c7c8c]">
                    Aucune manche trouvée pour cette compétition.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CoteCell({ v }: { v: number | null }) {
  const display = v == null ? "—" : v.toFixed(2);
  const isLow = v != null && v < 3;
  return (
    <td className={`px-3 py-3 font-bold tabular-nums ${isLow ? "text-[#28D7E6]" : "text-white"}`}>
      {display}
    </td>
  );
}
