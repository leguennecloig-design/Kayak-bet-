"use client";

import { useState } from "react";

type Stats = {
  athletes: number;
  competitions: number;
  courses: number;
  resultats: number;
  courses_pending: number;
};

type Competition = {
  id: string;
  code_ffck: number;
  nom: string;
  date_debut: string;
  ville: string | null;
  code_niveau: string;
  nb_courses: number;
  est_national: boolean;
  courses_synced: number;
  courses_total: number;
};

type SyncState = {
  loading: boolean;
  msg: string;
  ok: boolean | null;
};

function useSyncState() {
  return useState<SyncState>({ loading: false, msg: "", ok: null });
}

const NIVEAU_STYLE: Record<string, string> = {
  NAT: "text-[#28D7E6] bg-[rgba(40,215,230,.12)] border-[rgba(40,215,230,.3)]",
  REG: "text-[#9fbac6] bg-[rgba(255,255,255,.06)] border-[rgba(255,255,255,.1)]",
  INR: "text-[#7c9aaa] bg-[rgba(255,255,255,.04)] border-[rgba(255,255,255,.07)]",
};

export default function DataClient({
  initialStats,
  initialCompetitions,
}: {
  initialStats: Stats;
  initialCompetitions: Competition[];
}) {
  const [stats, setStats] = useState(initialStats);
  const [competitions] = useState(initialCompetitions);
  const [tab, setTab] = useState<"sync" | "competitions">("sync");
  const [classementState, setClassementState] = useSyncState();
  const [compState, setCompState] = useSyncState();
  const [resultatsState, setResultatsState] = useSyncState();
  const [compAnnee, setCompAnnee] = useState(2026);
  const [copied, setCopied] = useState(false);

  async function syncClassement() {
    setClassementState({ loading: true, msg: "", ok: null });
    try {
      const res = await fetch("/api/admin/sync/classement", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setClassementState({
          loading: false,
          msg: `✅ ${json.count} athlètes importés en ${(json.duration / 1000).toFixed(1)}s`,
          ok: true,
        });
        setStats((s) => ({ ...s, athletes: json.count }));
      } else {
        setClassementState({ loading: false, msg: `❌ ${json.error}`, ok: false });
      }
    } catch {
      setClassementState({ loading: false, msg: "❌ Erreur réseau", ok: false });
    }
  }

  async function syncCompetitions(annee: number) {
    setCompState({ loading: true, msg: `Sync ${annee}…`, ok: null });
    setCompAnnee(annee);
    try {
      const res = await fetch("/api/admin/sync/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annee, limit: 50 }),
      });
      const json = await res.json();
      if (res.ok) {
        setCompState({
          loading: false,
          msg: `✅ ${json.synced_competitions} compétitions, ${json.synced_courses} courses (${annee}) — ${(json.duration / 1000).toFixed(1)}s`,
          ok: true,
        });
        setStats((s) => ({
          ...s,
          competitions: s.competitions + json.synced_competitions,
          courses: s.courses + json.synced_courses,
          courses_pending: s.courses_pending + json.synced_courses,
        }));
      } else {
        setCompState({ loading: false, msg: `❌ ${json.error}`, ok: false });
      }
    } catch {
      setCompState({ loading: false, msg: "❌ Erreur réseau", ok: false });
    }
  }

  async function syncResultats() {
    setResultatsState({ loading: true, msg: "Sync en cours…", ok: null });
    try {
      const res = await fetch("/api/admin/sync/resultats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10 }),
      });
      const json = await res.json();
      if (res.ok) {
        setResultatsState({
          loading: false,
          msg: `✅ ${json.resultats} résultats (${json.courses} courses) — ${json.pending} restantes`,
          ok: true,
        });
        setStats((s) => ({
          ...s,
          resultats: s.resultats + json.resultats,
          courses_pending: json.pending,
        }));
      } else {
        setResultatsState({ loading: false, msg: `❌ ${json.error}`, ok: false });
      }
    } catch {
      setResultatsState({ loading: false, msg: "❌ Erreur réseau", ok: false });
    }
  }

  function copyCommand() {
    navigator.clipboard.writeText("npx tsx scripts/sync/run-all.ts");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const btnBase =
    "inline-flex items-center gap-2 font-archivo font-bold text-[13px] px-4 py-2 rounded-[10px] transition-all disabled:opacity-40 disabled:cursor-not-allowed";
  const btnPrimary =
    `${btnBase} bg-gradient-to-r from-[#28D7E6] to-[#11C2C2] text-[#0A2A3D] hover:-translate-y-[1px]`;
  const btnGhost =
    `${btnBase} bg-[rgba(255,255,255,.06)] border border-[var(--border-2)] text-[#9fbac6] hover:text-white hover:border-[rgba(40,215,230,.4)]`;

  const STAT_ITEMS = [
    { label: "Athlètes", value: stats.athletes, sub: "classement 2026" },
    { label: "Compétitions", value: stats.competitions, sub: "FFCK 2024+" },
    { label: "Courses", value: stats.courses, sub: `${stats.courses_pending} en attente` },
    { label: "Résultats", value: stats.resultats, sub: "liés aux athlètes" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-anton italic uppercase text-white text-[36px] leading-[0.9]">
            Données FFCK
          </h1>
          <p className="font-archivo text-[14px] text-[#7c9aaa] mt-2">
            Base officielle · API Descente · Saison 2026
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {STAT_ITEMS.map((s) => (
          <div
            key={s.label}
            className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[16px] px-5 py-4"
          >
            <div className="font-grotesk font-bold text-[9px] tracking-[.14em] uppercase text-[#5c7c8c] mb-2">
              {s.label}
            </div>
            <div className="font-anton italic text-[32px] text-[#28D7E6] leading-none">
              {s.value.toLocaleString("fr-FR")}
            </div>
            <div className="font-archivo text-[11.5px] text-[#5c7c8c] mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {(["sync", "competitions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`font-archivo font-semibold text-[13px] px-4 py-2 rounded-[10px] transition-colors ${
              tab === t
                ? "bg-[rgba(40,215,230,.12)] text-[#28D7E6] border border-[rgba(40,215,230,.3)]"
                : "text-[#7c9aaa] hover:text-white hover:bg-white/5"
            }`}
          >
            {t === "sync" ? "Synchronisation" : `Compétitions (${competitions.length})`}
          </button>
        ))}
      </div>

      {/* Tab: Sync */}
      {tab === "sync" && (
        <div className="flex flex-col gap-4">

          {/* Step 1 */}
          <div className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[18px] p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="font-grotesk font-bold text-[9px] tracking-[.14em] uppercase text-[#5c7c8c] mb-1">
                  Étape 1
                </div>
                <div className="font-archivo font-extrabold text-[15px] text-white">
                  Classement numérique 2026
                </div>
                <div className="font-archivo text-[13px] text-[#7c9aaa] mt-1">
                  Importe les 1 740 athlètes depuis{" "}
                  <code className="text-[#28D7E6] font-mono text-[12px]">
                    data/classement_2026.json
                  </code>{" "}
                  → Supabase
                </div>
              </div>
              <button
                onClick={syncClassement}
                disabled={classementState.loading}
                className={btnPrimary}
              >
                {classementState.loading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 60" />
                    </svg>
                    Import…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                      <path d="M12 16V4M8 12l4 4 4-4M4 20h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Importer
                  </>
                )}
              </button>
            </div>
            {classementState.msg && (
              <div className={`mt-3 font-archivo text-[12.5px] ${classementState.ok ? "text-[#28D7E6]" : "text-[#FF7A45]"}`}>
                {classementState.msg}
              </div>
            )}
          </div>

          {/* Step 2 */}
          <div className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[18px] p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="font-grotesk font-bold text-[9px] tracking-[.14em] uppercase text-[#5c7c8c] mb-1">
                  Étape 2
                </div>
                <div className="font-archivo font-extrabold text-[15px] text-white">
                  Compétitions FFCK
                </div>
                <div className="font-archivo text-[13px] text-[#7c9aaa] mt-1">
                  Récupère la liste des compétitions depuis l'API FFCK Descente (50 par an max)
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[2026, 2025, 2024].map((annee) => (
                  <button
                    key={annee}
                    onClick={() => syncCompetitions(annee)}
                    disabled={compState.loading}
                    className={compState.loading && compAnnee === annee ? btnPrimary : btnGhost}
                  >
                    {compState.loading && compAnnee === annee ? (
                      <>
                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 60" />
                        </svg>
                        {annee}
                      </>
                    ) : (
                      annee
                    )}
                  </button>
                ))}
              </div>
            </div>
            {compState.msg && (
              <div className={`mt-3 font-archivo text-[12.5px] ${compState.ok ? "text-[#28D7E6]" : "text-[#FF7A45]"}`}>
                {compState.msg}
              </div>
            )}
          </div>

          {/* Step 3 */}
          <div className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[18px] p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="font-grotesk font-bold text-[9px] tracking-[.14em] uppercase text-[#5c7c8c] mb-1">
                  Étape 3
                </div>
                <div className="font-archivo font-extrabold text-[15px] text-white">
                  Résultats
                </div>
                <div className="font-archivo text-[13px] text-[#7c9aaa] mt-1">
                  Sync les résultats des 10 prochaines courses en attente — relancer autant que nécessaire
                </div>
                {stats.courses_pending > 0 && (
                  <div className="font-grotesk font-bold text-[9.5px] tracking-[.1em] uppercase text-[#FF7A45] bg-[rgba(255,122,69,.1)] border border-[rgba(255,122,69,.25)] rounded-[5px] px-[7px] py-[3px] inline-block mt-2">
                    {stats.courses_pending} courses en attente
                  </div>
                )}
              </div>
              <button
                onClick={syncResultats}
                disabled={resultatsState.loading || stats.courses_pending === 0}
                className={btnPrimary}
              >
                {resultatsState.loading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 60" />
                    </svg>
                    Sync…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                      <path d="M4 12a8 8 0 0 1 14.93-3.86M20 12a8 8 0 0 1-14.93 3.86M4 5v5h5M20 19v-5h-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Sync 10 courses
                  </>
                )}
              </button>
            </div>
            {resultatsState.msg && (
              <div className={`mt-3 font-archivo text-[12.5px] ${resultatsState.ok ? "text-[#28D7E6]" : "text-[#FF7A45]"}`}>
                {resultatsState.msg}
              </div>
            )}
          </div>

          {/* Full sync CLI */}
          <div className="bg-[rgba(255,255,255,.02)] border border-dashed border-[var(--border-2)] rounded-[16px] p-5">
            <div className="font-grotesk font-bold text-[9.5px] tracking-[.14em] uppercase text-[#5c7c8c] mb-2">
              Sync complète (terminal — historique 2024–2026)
            </div>
            <div className="flex items-center gap-3">
              <code className="flex-1 font-mono text-[13px] text-[#28D7E6] bg-[rgba(40,215,230,.06)] border border-[rgba(40,215,230,.2)] rounded-[8px] px-4 py-2.5">
                npx tsx scripts/sync/run-all.ts
              </code>
              <button
                onClick={copyCommand}
                className={`${btnGhost} flex-none`}
              >
                {copied ? "✓ Copié" : "Copier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Competitions */}
      {tab === "competitions" && (
        <div className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[18px] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[5rem_1fr_6rem_5rem_5rem_5rem] gap-3 px-5 py-3 border-b border-[var(--border-2)]">
            {["Code", "Compétition", "Date", "Niveau", "Courses", "Résultats"].map((h) => (
              <span key={h} className="font-grotesk font-bold text-[9px] tracking-[.14em] uppercase text-[#5c7c8c]">
                {h}
              </span>
            ))}
          </div>

          {competitions.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-archivo text-[14px] text-[#5c7c8c]">
                Aucune compétition FFCK en base.
              </p>
              <p className="font-archivo text-[12.5px] text-[#3c5a6a] mt-2">
                Lance l'étape 2 pour importer les compétitions.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)] max-h-[600px] overflow-y-auto">
              {competitions.map((c) => {
                const synced = c.courses_synced === c.courses_total && c.courses_total > 0;
                const partial = c.courses_synced > 0 && c.courses_synced < c.courses_total;
                return (
                  <div
                    key={c.id}
                    className="grid grid-cols-[5rem_1fr_6rem_5rem_5rem_5rem] gap-3 px-5 py-3.5 hover:bg-[rgba(255,255,255,.03)] transition-colors"
                  >
                    <div className="font-mono text-[11px] text-[#5c7c8c] self-center">{c.code_ffck}</div>
                    <div className="self-center min-w-0">
                      <div className="font-archivo font-extrabold text-[13.5px] text-white truncate">{c.nom}</div>
                      {c.ville && (
                        <div className="font-archivo text-[11.5px] text-[#5c7c8c] mt-0.5">{c.ville}</div>
                      )}
                    </div>
                    <div className="font-archivo text-[12px] text-[#7c9aaa] self-center">
                      {new Date(c.date_debut).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </div>
                    <div className="self-center">
                      <span className={`font-grotesk font-bold text-[9px] tracking-[.1em] uppercase border rounded-[5px] px-[6px] py-[3px] ${NIVEAU_STYLE[c.code_niveau] ?? NIVEAU_STYLE.INR}`}>
                        {c.code_niveau}
                      </span>
                    </div>
                    <div className="font-archivo text-[13px] text-white self-center">{c.nb_courses}</div>
                    <div className="self-center">
                      {c.courses_total === 0 ? (
                        <span className="font-grotesk text-[9px] text-[#5c7c8c]">—</span>
                      ) : synced ? (
                        <span className="font-grotesk font-bold text-[9px] tracking-[.1em] uppercase text-[#28D7E6]">✓ sync</span>
                      ) : partial ? (
                        <span className="font-grotesk font-bold text-[9px] tracking-[.1em] uppercase text-[#f0a500]">
                          {c.courses_synced}/{c.courses_total}
                        </span>
                      ) : (
                        <span className="font-grotesk font-bold text-[9px] tracking-[.1em] uppercase text-[#FF7A45]">en attente</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
