"use client";

import { useState, useCallback } from "react";
import { ALGO_PARAMS } from "@/lib/algo/bradley-terry";
import { parseResultFile, type ParseResult } from "@/lib/algo/result-parser";

type Format = "standard" | "sprint_finale" | "mass_start";

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
  sources_utilisees: string | null;
  score_composite: number | null;
  score_final: number | null;
  rang_espere: number | null;
  fallback_type: string | null;
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
  SEL: "text-[#b39ddb] bg-[rgba(179,157,219,.12)] border-[rgba(179,157,219,.3)]",
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

function FallbackBadge({ type }: { type: string | null }) {
  if (!type || type === "discipline") return null;
  if (type === "autre_discipline") return (
    <span className="ml-1.5 text-[9px] font-grotesk font-bold uppercase tracking-wide bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded px-1.5 py-0.5">
      ⚠ autre disc.
    </span>
  );
  return (
    <span className="ml-1.5 text-[9px] font-grotesk font-bold uppercase tracking-wide bg-red-500/10 text-red-400 border border-red-500/20 rounded px-1.5 py-0.5">
      ⚠ nat only
    </span>
  );
}

export default function CotesClient({
  competitions,
}: {
  competitions: Competition[];
}) {
  const [selectedCompId, setSelectedCompId]   = useState<string>(competitions[0]?.id ?? "");
  const [selectedCourseId, setSelectedCourseId] = useState<string>(competitions[0]?.courses[0]?.id ?? "");
  const [selectedCat, setSelectedCat]         = useState<string>("Tous");
  const [cotes, setCotes]                     = useState<CoteRow[]>([]);
  const [loadingCotes, setLoadingCotes]       = useState(false);
  const [recalcState, setRecalcState]         = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [recalcAllState, setRecalcAllState]   = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [showParams, setShowParams]           = useState(false);
  const [courseCotesCounts, setCourseCotesCounts] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const c of competitions) {
      for (const course of c.courses) map[course.id] = course.cotes_count;
    }
    return map;
  });

  // Sprint Finale / Mass Start
  const [format, setFormat] = useState<Format>("standard");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [specialState, setSpecialState] = useState<"idle" | "ready" | "loading" | "ok" | "error">("idle");
  const [specialError, setSpecialError] = useState("");

  function resetSpecialFormat() {
    setUploadFile(null);
    setPreview(null);
    setSpecialState("idle");
    setSpecialError("");
  }

  function selectFormat(f: Format) {
    setFormat(f);
    resetSpecialFormat();
  }

  async function handleFileSelect(file: File) {
    setUploadFile(file);
    setSpecialError("");
    const content = await file.text();
    const parsed = parseResultFile(content, file.name);
    setPreview(parsed);
    if (parsed.data.length === 0) {
      setSpecialState("error");
      setSpecialError(parsed.errors[0] ?? "Fichier invalide ou vide");
    } else {
      setSpecialState("ready");
    }
  }

  async function submitSpecialFormat() {
    if (!uploadFile || !selectedCourseId) return;
    setSpecialState("loading");
    setSpecialError("");
    try {
      const fd = new FormData();
      fd.append("courseId", selectedCourseId);
      fd.append("format", format);
      fd.append("fichier", uploadFile);
      const res = await fetch("/api/admin/recalculate", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      setSpecialState("ok");
      await fetchCotes(selectedCourseId, selectedCat);
      setTimeout(() => resetSpecialFormat(), 3000);
    } catch (e) {
      setSpecialState("error");
      setSpecialError(e instanceof Error ? e.message : "Erreur réseau");
    }
  }

  const selectedComp = competitions.find(c => c.id === selectedCompId) ?? competitions[0];

  const fetchCotes = useCallback(async (courseId: string, cat = "Tous") => {
    if (!courseId) return;
    setLoadingCotes(true);
    setCotes([]);
    setSelectedCat(cat);
    try {
      const url = cat !== "Tous"
        ? `/api/cotes/${courseId}?categorie=${encodeURIComponent(cat)}`
        : `/api/cotes/${courseId}`;
      const res = await fetch(url);
      if (!res.ok) { setCotes([]); return; }
      const data = await res.json();
      setCotes(Array.isArray(data) ? data : []);
    } catch {
      setCotes([]);
    } finally {
      setLoadingCotes(false);
    }
  }, []);

  function selectComp(compId: string) {
    setSelectedCompId(compId);
    const comp      = competitions.find(c => c.id === compId);
    const firstCourse = comp?.courses[0];
    const cId       = firstCourse?.id ?? "";
    setSelectedCourseId(cId);
    setSelectedCat("Tous");
    setCotes([]);
    resetSpecialFormat();
    setFormat("standard");
    if (cId) fetchCotes(cId, "Tous");
  }

  function selectCourse(courseId: string) {
    setSelectedCourseId(courseId);
    setSelectedCat("Tous");
    resetSpecialFormat();
    setFormat("standard");
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
      setCourseCotesCounts(prev => ({ ...prev, [courseId]: total }));
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
      for (const [cId, info] of Object.entries(json.results as Record<string, { total: number }>)) {
        newCounts[cId] = info.total;
      }
      setCourseCotesCounts(prev => ({ ...prev, ...newCounts }));
      setRecalcAllState("ok");
      if (selectedCourseId) await fetchCotes(selectedCourseId, selectedCat);
      setTimeout(() => setRecalcAllState("idle"), 4000);
    } catch {
      setRecalcAllState("error");
      setTimeout(() => setRecalcAllState("idle"), 4000);
    }
  }

  const allCats = cotes.length > 0
    ? ["Tous", ...Array.from(new Set(cotes.map(c => c.categorie))).sort()]
    : ["Tous"];

  const displayedCotes = selectedCat !== "Tous"
    ? cotes.filter(c => c.categorie === selectedCat)
    : cotes;

  const badge      = selectedComp?.code_type ?? selectedComp?.code_niveau ?? "";
  const badgeStyle = NIVEAU_STYLE[badge] ?? "text-[#7c9aaa] bg-[rgba(124,154,170,.1)] border-[rgba(124,154,170,.3)]";

  const SpinIcon = ({ cls = "w-3.5 h-3.5" }) => (
    <svg className={`${cls} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
    </svg>
  );
  const CheckIcon = ({ cls = "w-3.5 h-3.5" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cls}>
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  const RefreshIcon = ({ cls = "w-3.5 h-3.5" }) => (
    <svg viewBox="0 0 24 24" fill="none" className={cls}>
      <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 9A8 8 0 0 0 5.3 5.3M4 15a8 8 0 0 0 14.7 3.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="font-anton italic uppercase text-white text-[36px] leading-[0.9]">Cotes</h1>
          <p className="font-archivo text-[14px] text-[#7c9aaa] mt-2">
            Bradley-Terry v3.0 — SEF · NAT · IR · NUM hiérarchisés · C2 inclus
          </p>
        </div>
        <button
          onClick={recalcAll}
          disabled={recalcAllState === "loading"}
          className="inline-flex items-center gap-2 bg-[rgba(255,122,69,.12)] border border-[rgba(255,122,69,.4)] text-[#FF7A45] font-archivo font-bold text-[12px] px-4 py-2.5 rounded-[10px] hover:bg-[rgba(255,122,69,.2)] transition-colors disabled:opacity-50"
        >
          {recalcAllState === "loading" ? <SpinIcon /> : recalcAllState === "ok" ? <CheckIcon /> : <RefreshIcon />}
          Recalculer tout
        </button>
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <div className="flex flex-col gap-1.5">
          <p className="font-grotesk font-bold text-[9px] tracking-[.16em] uppercase text-[#5c7c8c] px-1 mb-1">
            Compétitions
          </p>
          {competitions.map(c => {
            const b      = c.code_type ?? c.code_niveau ?? "";
            const bStyle = NIVEAU_STYLE[b] ?? "text-[#7c9aaa] bg-[rgba(124,154,170,.1)] border-[rgba(124,154,170,.3)]";
            const total  = c.courses.reduce((acc, cr) => acc + (courseCotesCounts[cr.id] ?? cr.cotes_count), 0);
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
                  <span className={`font-grotesk font-bold text-[8.5px] tracking-[.1em] uppercase border rounded-[4px] px-[6px] py-[2px] ${bStyle}`}>
                    {b}
                  </span>
                  {total > 0 && <span className="font-grotesk text-[9px] text-[#28D7E6]">{total} cotes</span>}
                </div>
                <div className="font-archivo font-semibold text-[12px] text-white leading-tight">{c.nom}</div>
                {c.date_debut && (
                  <div className="font-archivo text-[11px] text-[#5c7c8c] mt-0.5">{fmtDate(c.date_debut)}</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Main */}
        <div>
          {selectedComp && (
            <>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className={`font-grotesk font-bold text-[9px] tracking-[.12em] uppercase border rounded-[5px] px-[7px] py-[3px] ${badgeStyle}`}>
                    {badge}
                  </span>
                  <h2 className="font-archivo font-extrabold text-[18px] text-white">{selectedComp.nom}</h2>
                </div>
              </div>

              {selectedComp.courses.length > 0 ? (
                <>
                  {/* Course tabs */}
                  <div className="flex items-center gap-2 mb-5 flex-wrap">
                    {selectedComp.courses.map(course => {
                      const count = courseCotesCounts[course.id] ?? course.cotes_count;
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
                          {course.libelle ?? course.code_course}
                          {count > 0 && <span className="ml-1.5 text-[10px] opacity-70">{count}</span>}
                        </button>
                      );
                    })}

                  </div>

                  {/* Format + calcul */}
                  {selectedCourseId && (
                    <div className="border border-[var(--border-2)] rounded-[14px] p-4 mb-5">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {([
                          { key: "standard", label: "Standard (algo v3)" },
                          { key: "sprint_finale", label: "Sprint Finale" },
                          { key: "mass_start", label: "Mass Start" },
                        ] as { key: Format; label: string }[]).map(({ key, label }) => (
                          <button
                            key={key}
                            onClick={() => selectFormat(key)}
                            className={`font-archivo font-semibold text-[11.5px] px-3.5 py-2 rounded-[8px] border transition-colors ${
                              format === key
                                ? "border-[rgba(40,215,230,.5)] bg-[rgba(40,215,230,.08)] text-[#28D7E6]"
                                : "border-[var(--border-2)] text-[#7c9aaa] hover:border-[rgba(40,215,230,.3)] hover:text-white"
                            }`}
                          >
                            {label}
                          </button>
                        ))}

                        {format === "standard" && (
                          <button
                            onClick={() => recalculate(selectedCourseId)}
                            disabled={recalcState === "loading"}
                            className="ml-auto inline-flex items-center gap-1.5 font-archivo font-semibold text-[11px] text-[#FF7A45] border border-[rgba(255,122,69,.3)] px-3 py-2 rounded-[9px] hover:bg-[rgba(255,122,69,.1)] transition-colors disabled:opacity-50"
                          >
                            {recalcState === "loading" ? <SpinIcon cls="w-3 h-3" /> : recalcState === "ok" ? <CheckIcon cls="w-3 h-3" /> : <RefreshIcon cls="w-3 h-3" />}
                            Recalculer
                          </button>
                        )}
                      </div>

                      {format !== "standard" && (
                        <div>
                          <p className="font-archivo text-[12px] text-[#7c9aaa] mb-3">
                            {format === "sprint_finale"
                              ? "Fichier des résultats de qualifs (60% qualifs + 40% algo v3)."
                              : "Fichier des résultats classique du week-end (80% classique + 20% algo v3)."}
                            {" "}Formats acceptés : CSV, TXT, JSON.
                          </p>

                          <label className="inline-flex items-center gap-2 font-archivo font-semibold text-[12px] text-[#28D7E6] border border-[rgba(40,215,230,.35)] rounded-[9px] px-3.5 py-2 cursor-pointer hover:bg-[rgba(40,215,230,.08)] transition-colors">
                            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                              <path d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {uploadFile ? uploadFile.name : "Choisir un fichier"}
                            <input
                              type="file"
                              accept=".csv,.txt,.json"
                              className="hidden"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                            />
                          </label>

                          {preview && (
                            <div className="mt-3">
                              {preview.data.length > 0 && (
                                <p className="font-archivo text-[12px] text-[#7c9aaa] mb-2">
                                  ✓ {preview.data.length} ligne{preview.data.length > 1 ? "s" : ""} parsée{preview.data.length > 1 ? "s" : ""}
                                  {" "}({preview.format_detected}) · {preview.errors.length} erreur{preview.errors.length > 1 ? "s" : ""}
                                  {" "}· catégories : {[...new Set(preview.data.map(r => r.categorie))].join(", ")}
                                </p>
                              )}
                              {preview.errors.length > 0 && (
                                <div className="text-[11px] font-archivo text-red-400 mb-2 space-y-0.5">
                                  {preview.errors.slice(0, 5).map((err, i) => <p key={i}>{err}</p>)}
                                  {preview.errors.length > 5 && <p>… et {preview.errors.length - 5} autre(s)</p>}
                                </div>
                              )}
                              {preview.data.length > 0 && (
                                <div className="overflow-x-auto border border-[var(--border-2)] rounded-[10px] mb-3">
                                  <table className="w-full font-archivo text-[11.5px]">
                                    <thead>
                                      <tr className="border-b border-[var(--border-2)]">
                                        {["Rang", "Nom", "Code bateau", "Catégorie"].map(h => (
                                          <th key={h} className="px-2.5 py-2 text-left font-grotesk font-bold text-[9px] tracking-[.08em] uppercase text-[#5c7c8c]">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {preview.data.slice(0, 8).map((r, i) => (
                                        <tr key={i} className="border-b border-[var(--border-2)] last:border-0">
                                          <td className="px-2.5 py-1.5 text-[#7c9aaa]">{r.rang}</td>
                                          <td className="px-2.5 py-1.5 text-white">{[r.nom, r.prenom].filter(Boolean).join(" ") || "—"}</td>
                                          <td className="px-2.5 py-1.5 text-[#7c9aaa]">{r.code_bateau}</td>
                                          <td className="px-2.5 py-1.5 text-[#7c9aaa]">{r.categorie}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {preview.data.length > 8 && (
                                    <p className="font-archivo text-[10.5px] text-[#5c7c8c] px-2.5 py-1.5">
                                      … et {preview.data.length - 8} autre(s) ligne(s)
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {specialError && (
                            <p className="font-archivo text-[12px] text-red-400 mb-3">{specialError}</p>
                          )}

                          {preview && preview.data.length > 0 && (
                            <button
                              onClick={submitSpecialFormat}
                              disabled={specialState === "loading"}
                              className="inline-flex items-center gap-1.5 font-archivo font-bold text-[12px] text-[#0A2A3D] bg-gradient-to-r from-[#28D7E6] to-[#11C2C2] px-4 py-2.5 rounded-[9px] hover:-translate-y-[1px] transition-transform disabled:opacity-50"
                            >
                              {specialState === "loading" ? <SpinIcon cls="w-3.5 h-3.5" /> : specialState === "ok" ? <CheckIcon cls="w-3.5 h-3.5" /> : null}
                              {specialState === "ok" ? "Cotes calculées ✓" : "Calculer les cotes →"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Category filter */}
                  {allCats.length > 1 && (
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {allCats.map(cat => (
                        <button
                          key={cat}
                          onClick={() => { setSelectedCat(cat); fetchCotes(selectedCourseId, cat); }}
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

                  {/* Table */}
                  {loadingCotes ? (
                    <div className="flex items-center gap-3 py-12 text-[#5c7c8c] font-archivo text-[13px]">
                      <SpinIcon cls="w-4 h-4" /> Calcul en cours…
                    </div>
                  ) : displayedCotes.length === 0 ? (
                    <div className="text-center py-14 border border-dashed border-[var(--border-2)] rounded-2xl">
                      <p className="font-archivo text-[13px] text-[#5c7c8c]">Aucune cote calculée pour cette manche.</p>
                      <p className="font-archivo text-[12px] text-[#3a5c6c] mt-1">Clique sur &quot;Recalculer&quot; pour générer les cotes.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full font-archivo text-[12px]">
                        <thead>
                          <tr className="border-b border-[var(--border-2)]">
                            {["#", "Athlète", "Cat.", "Rg nat.", "Sources", "E[Rg]", "Top 1", "Top 3", "Top 5", "Top 10", "Top 20"].map(h => (
                              <th key={h} className="px-3 py-2.5 text-left font-grotesk font-bold text-[9.5px] tracking-[.1em] uppercase text-[#5c7c8c]">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {displayedCotes.map((row, i) => (
                            <tr key={row.id} className="border-b border-[var(--border-2)] hover:bg-white/[.015] transition-colors">
                              <td className="px-3 py-3 text-[#5c7c8c] font-semibold">{i + 1}</td>
                              <td className="px-3 py-3">
                                <span className="font-semibold text-white">{row.nom ?? row.code_bateau}</span>
                                <span className="ml-2 text-[10px] text-[#5c7c8c]">{row.code_bateau}</span>
                                <FallbackBadge type={row.fallback_type} />
                              </td>
                              <td className="px-3 py-3 text-[#7c9aaa]">{row.categorie}</td>
                              <td className="px-3 py-3 text-[#7c9aaa]">{row.rang_national ?? "—"}</td>
                              <td className="px-3 py-3">
                                <span className="font-grotesk text-[9.5px] font-bold tracking-wide text-[#28D7E6]">
                                  {row.sources_utilisees ?? "NUM"}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-[#5c7c8c]">{fmt(row.rang_espere, 1)}</td>
                              <CoteCell v={row.cote_top1} />
                              <CoteCell v={row.cote_top3} />
                              <CoteCell v={row.cote_top5} />
                              <CoteCell v={row.cote_top10} />
                              <CoteCell v={row.cote_top20} />
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Meta info */}
                      {displayedCotes[0]?.calculated_at && (
                        <p className="font-archivo text-[11px] text-[#3a5c6c] mt-3 text-right">
                          Calculé le {fmtDate(displayedCotes[0].calculated_at)} · {displayedCotes[0].algo_version}
                          · {displayedCotes[0].nb_athletes_startlist} athlètes · marge {Math.round((ALGO_PARAMS.MARGE - 1) * 100)}%
                        </p>
                      )}

                      {/* Légende fallback */}
                      {displayedCotes.some(r => r.fallback_type && r.fallback_type !== 'discipline') && (
                        <div className="mt-3 flex gap-5 text-[11px] font-archivo text-[#5c7c8c] flex-wrap">
                          <span><span className="text-orange-400">⚠ autre disc.</span> = résultats discipline opposée</span>
                          <span><span className="text-red-400">⚠ nat only</span> = uniquement classement numérique</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 border border-dashed border-[var(--border-2)] rounded-2xl">
                  <p className="font-archivo text-[13px] text-[#5c7c8c]">Aucune manche trouvée.</p>
                </div>
              )}

              {/* Paramètres algo */}
              <div className="mt-10 border-t border-[var(--border-2)] pt-6">
                <button
                  onClick={() => setShowParams(v => !v)}
                  className="font-grotesk font-bold text-[10px] tracking-[.12em] uppercase text-[#5c7c8c] hover:text-white transition-colors flex items-center gap-2"
                >
                  <svg viewBox="0 0 24 24" fill="none" className={`w-3.5 h-3.5 transition-transform ${showParams ? "rotate-90" : ""}`}>
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Paramètres algo (v3.0)
                </button>
                {showParams && (
                  <pre className="mt-3 text-[11px] font-mono text-[#7c9aaa] bg-[rgba(7,31,45,.6)] border border-[var(--border-2)] rounded-xl p-4 overflow-x-auto">
                    {JSON.stringify(ALGO_PARAMS, null, 2)}
                  </pre>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CoteCell({ v }: { v: number | null }) {
  const display = v == null ? "—" : v.toFixed(2);
  const isLow   = v != null && v < 3;
  return (
    <td className={`px-3 py-3 font-bold tabular-nums ${isLow ? "text-[#28D7E6]" : "text-white"}`}>
      {display}
    </td>
  );
}
