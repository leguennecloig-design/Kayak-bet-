"use client";

import { useState, useCallback } from "react";
import type { FFCKCompetitionListItem } from "@/lib/scrapers/ffck-inscriptions";

type Competition = {
  id: string;
  nom: string;
  date: string | null;
  lieu: string | null;
  discipline: string | null;
  status: string;
  ffck_inscription_code: number | null;
  ffck_match_status: string;
  nb_partants: number;
};

type ScanResultItem = {
  competitionId: string;
  nom: string;
  status: "matche_auto" | "ambigu" | "introuvable";
  ffckCode?: number;
  confidence?: number;
  candidates?: FFCKCompetitionListItem[];
};

type InscriptionRow = {
  id: string;
  code_bateau: string;
  nom: string;
  sexe: string | null;
  club: string | null;
  numero_club: string | null;
  licence_valide: boolean | null;
  pagaie_couleur: string | null;
  athlete_id: string | null;
};

const MATCH_STYLE: Record<string, { label: string; cls: string }> = {
  non_matche:    { label: "Non matché",   cls: "text-[#5c7c8c] bg-[rgba(92,124,140,.1)]  border-[rgba(92,124,140,.3)]" },
  matche_auto:   { label: "Auto",         cls: "text-[#a0f0a0] bg-[rgba(160,240,160,.1)] border-[rgba(160,240,160,.3)]" },
  matche_manuel: { label: "Manuel",       cls: "text-[#28D7E6] bg-[rgba(40,215,230,.1)]  border-[rgba(40,215,230,.3)]" },
  ambigu:        { label: "Ambigu",       cls: "text-[#FF7A45] bg-[rgba(255,122,69,.12)] border-[rgba(255,122,69,.3)]" },
  introuvable:   { label: "Introuvable",  cls: "text-red-400   bg-red-500/10             border-red-500/30" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function SpinIcon({ cls = "w-3.5 h-3.5" }: { cls?: string }) {
  return (
    <svg className={`${cls} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
    </svg>
  );
}
function CheckIcon({ cls = "w-3.5 h-3.5" }: { cls?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cls}>
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function InscriptionsClient({ competitions: initial }: { competitions: Competition[] }) {
  const [competitions, setCompetitions] = useState(initial);
  const [scanState,   setScanState]   = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [scanMsg,     setScanMsg]     = useState<string | null>(null);
  const [scanDetails, setScanDetails] = useState<ScanResultItem[]>([]);

  // Partants chargés par compétition (clé = competition.id)
  const [partantsMap,     setPartantsMap]     = useState<Record<string, InscriptionRow[]>>({});
  const [partantsLoading, setPartantsLoading] = useState<Record<string, boolean>>({});
  const [fetchMsg,        setFetchMsg]        = useState<Record<string, string>>({});

  // Sélection manuelle des candidats ambigus (clé = competition.id → ffckCode choisi)
  const [candidateChoice, setCandidateChoice] = useState<Record<string, number>>({});
  const [confirmLoading,  setConfirmLoading]  = useState<Record<string, boolean>>({});

  // ── Scanner ───────────────────────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    setScanState("loading");
    setScanMsg(null);
    setScanDetails([]);
    try {
      const res = await fetch("/api/admin/inscriptions/scan", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur serveur");
      const { summary, results } = json as {
        summary: { auto: number; ambigu: number; introuvable: number };
        results: ScanResultItem[];
      };
      setScanState("ok");
      setScanMsg(`${summary.auto} auto-matché(s) · ${summary.ambigu} ambigu(s) · ${summary.introuvable} introuvable(s)`);
      setScanDetails(results ?? []);
      // Rafraîchit le statut matching dans l'état local
      setCompetitions(prev =>
        prev.map(c => {
          const r = results?.find(r => r.competitionId === c.id);
          if (!r) return c;
          return {
            ...c,
            ffck_match_status: r.status,
            ffck_inscription_code: r.ffckCode ?? c.ffck_inscription_code,
          };
        })
      );
      setTimeout(() => setScanState("idle"), 5000);
    } catch (e) {
      setScanState("error");
      setScanMsg(e instanceof Error ? e.message : "Erreur inconnue");
      setTimeout(() => setScanState("idle"), 6000);
    }
  }, []);

  // ── Confirmer un matching manuel ─────────────────────────────────────────
  const handleConfirm = useCallback(async (compId: string) => {
    const ffckCode = candidateChoice[compId];
    if (!ffckCode) return;
    setConfirmLoading(prev => ({ ...prev, [compId]: true }));
    try {
      const res = await fetch("/api/admin/inscriptions/confirm-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitionId: compId, ffckCode }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setCompetitions(prev =>
        prev.map(c => c.id === compId
          ? { ...c, ffck_inscription_code: ffckCode, ffck_match_status: "matche_manuel" }
          : c
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      setConfirmLoading(prev => ({ ...prev, [compId]: false }));
    }
  }, [candidateChoice]);

  // ── Récupérer les partants ────────────────────────────────────────────────
  const handleFetch = useCallback(async (compId: string) => {
    setPartantsLoading(prev => ({ ...prev, [compId]: true }));
    setFetchMsg(prev => ({ ...prev, [compId]: "" }));
    try {
      const res = await fetch(`/api/admin/inscriptions/fetch/${compId}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      setFetchMsg(prev => ({ ...prev, [compId]: json.message ?? `${json.imported} importés` }));
      setCompetitions(prev =>
        prev.map(c => c.id === compId ? { ...c, nb_partants: json.imported ?? c.nb_partants } : c)
      );
    } catch (e) {
      setFetchMsg(prev => ({ ...prev, [compId]: `Erreur : ${e instanceof Error ? e.message : "inconnue"}` }));
    } finally {
      setPartantsLoading(prev => ({ ...prev, [compId]: false }));
    }
  }, []);

  // ── Charger le détail des partants ───────────────────────────────────────
  const handleShowPartants = useCallback(async (compId: string) => {
    if (partantsMap[compId]) {
      // Toggle off
      setPartantsMap(prev => { const n = { ...prev }; delete n[compId]; return n; });
      return;
    }
    setPartantsLoading(prev => ({ ...prev, [`detail_${compId}`]: true }));
    try {
      const res = await fetch(`/api/admin/inscriptions/list/${compId}`);
      if (res.ok) {
        const data = await res.json();
        setPartantsMap(prev => ({ ...prev, [compId]: data }));
      }
    } finally {
      setPartantsLoading(prev => ({ ...prev, [`detail_${compId}`]: false }));
    }
  }, [partantsMap]);

  const isMatched = (c: Competition) =>
    c.ffck_match_status === "matche_auto" || c.ffck_match_status === "matche_manuel";

  const ambiguCandidates = (compId: string): FFCKCompetitionListItem[] =>
    scanDetails.find(r => r.competitionId === compId)?.candidates ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-anton italic uppercase text-white text-[36px] leading-[0.9]">Inscriptions</h1>
          <p className="font-archivo text-[14px] text-[#7c9aaa] mt-2">
            Partants FFCK · Descente · matching automatique ou manuel
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleScan}
            disabled={scanState === "loading"}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#28D7E6] to-[#11C2C2] text-[#0A2A3D] font-archivo font-bold text-[13px] px-5 py-3 rounded-[11px] hover:-translate-y-[1px] transition-transform disabled:opacity-50 disabled:translate-y-0"
          >
            {scanState === "loading" ? (
              <SpinIcon />
            ) : scanState === "ok" ? (
              <CheckIcon />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M16.5 16.5l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
            Scanner les compétitions Descente
          </button>
          {scanMsg && (
            <p className={`font-archivo text-[12px] ${scanState === "error" ? "text-red-400" : "text-[#a0f0a0]"}`}>
              {scanMsg}
            </p>
          )}
        </div>
      </div>

      {/* Tableau */}
      {competitions.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[var(--border-2)] rounded-2xl">
          <p className="font-archivo text-[15px] text-[#5c7c8c]">Aucune compétition active trouvée.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {competitions.map(comp => {
            const ms   = MATCH_STYLE[comp.ffck_match_status] ?? MATCH_STYLE.non_matche;
            const cands = ambiguCandidates(comp.id);
            const showCandidates = comp.ffck_match_status === "ambigu" && cands.length > 0;
            const detailOpen = !!partantsMap[comp.id];

            return (
              <div
                key={comp.id}
                className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[16px] px-6 py-5"
              >
                {/* Ligne principale */}
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Badge statut matching */}
                  <span className={`font-grotesk font-bold text-[9px] tracking-[.14em] uppercase border rounded-[5px] px-[7px] py-[3px] flex-none ${ms.cls}`}>
                    {ms.label}
                  </span>

                  {/* Infos compétition */}
                  <div className="flex-1 min-w-0">
                    <div className="font-archivo font-extrabold text-[15px] text-white truncate">{comp.nom}</div>
                    <div className="font-archivo text-[12px] text-[#5c7c8c] flex items-center gap-3 mt-0.5 flex-wrap">
                      {comp.lieu && <span>{comp.lieu}</span>}
                      {comp.date && <span>{fmtDate(comp.date)}</span>}
                      {comp.ffck_inscription_code && (
                        <span className="text-[#28D7E6]">FFCK #{comp.ffck_inscription_code}</span>
                      )}
                      {comp.nb_partants > 0 && (
                        <span className="text-[#a0f0a0]">{comp.nb_partants} partants</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-none">
                    {isMatched(comp) && (
                      <>
                        <button
                          onClick={() => handleFetch(comp.id)}
                          disabled={partantsLoading[comp.id]}
                          className="inline-flex items-center gap-1.5 font-archivo font-semibold text-[12px] text-[#28D7E6] border border-[rgba(40,215,230,.3)] px-3 py-2 rounded-[9px] hover:bg-[rgba(40,215,230,.08)] transition-colors disabled:opacity-50"
                        >
                          {partantsLoading[comp.id] ? <SpinIcon cls="w-3 h-3" /> : null}
                          Récupérer les partants
                        </button>
                        {comp.nb_partants > 0 && (
                          <button
                            onClick={() => handleShowPartants(comp.id)}
                            disabled={partantsLoading[`detail_${comp.id}`]}
                            className="font-archivo font-semibold text-[12px] text-[#7c9aaa] border border-[var(--border-2)] px-3 py-2 rounded-[9px] hover:text-white hover:border-[rgba(40,215,230,.3)] transition-colors"
                          >
                            {detailOpen ? "Masquer" : "Voir la liste"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Message fetch */}
                {fetchMsg[comp.id] && (
                  <p className={`font-archivo text-[12px] mt-2 ${fetchMsg[comp.id].startsWith("Erreur") ? "text-red-400" : "text-[#a0f0a0]"}`}>
                    {fetchMsg[comp.id]}
                  </p>
                )}

                {/* Sélection manuelle pour ambigu */}
                {showCandidates && (
                  <div className="mt-4 p-4 bg-[rgba(255,122,69,.05)] border border-[rgba(255,122,69,.2)] rounded-[12px]">
                    <p className="font-grotesk font-bold text-[10px] tracking-[.12em] uppercase text-[#FF7A45] mb-3">
                      Plusieurs candidats FFCK — choisir le bon :
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <select
                        value={candidateChoice[comp.id] ?? ""}
                        onChange={e => setCandidateChoice(prev => ({
                          ...prev, [comp.id]: parseInt(e.target.value, 10)
                        }))}
                        className="flex-1 min-w-[260px] font-archivo text-[13px] bg-[rgba(7,31,45,.8)] border border-[var(--border-2)] text-white rounded-[9px] px-3 py-2"
                      >
                        <option value="">— Sélectionner —</option>
                        {cands.map(c => (
                          <option key={c.ffckCode} value={c.ffckCode}>
                            #{c.ffckCode} · {c.nom} · {c.ville} · {c.dateDebut}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleConfirm(comp.id)}
                        disabled={!candidateChoice[comp.id] || confirmLoading[comp.id]}
                        className="inline-flex items-center gap-1.5 font-archivo font-bold text-[12px] bg-[rgba(255,122,69,.15)] border border-[rgba(255,122,69,.4)] text-[#FF7A45] px-4 py-2 rounded-[9px] hover:bg-[rgba(255,122,69,.25)] transition-colors disabled:opacity-40"
                      >
                        {confirmLoading[comp.id] ? <SpinIcon cls="w-3 h-3" /> : <CheckIcon cls="w-3 h-3" />}
                        Confirmer
                      </button>
                    </div>
                  </div>
                )}

                {/* Tableau des partants (détail) */}
                {detailOpen && partantsMap[comp.id] && (
                  <div className="mt-5 border-t border-[var(--border-2)] pt-4">
                    <p className="font-grotesk font-bold text-[10px] tracking-[.12em] uppercase text-[#5c7c8c] mb-3">
                      {partantsMap[comp.id].length} partants
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full font-archivo text-[12px]">
                        <thead>
                          <tr className="border-b border-[var(--border-2)]">
                            {["Code bateau", "Nom", "Club", "Licence", "Lié"].map(h => (
                              <th key={h} className="px-3 py-2 text-left font-grotesk font-bold text-[9.5px] tracking-[.1em] uppercase text-[#5c7c8c]">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {partantsMap[comp.id].slice(0, 50).map(row => (
                            <tr key={row.id} className="border-b border-[var(--border-2)] hover:bg-white/[.015]">
                              <td className="px-3 py-2 font-mono text-[11px] text-[#7c9aaa]">{row.code_bateau}</td>
                              <td className="px-3 py-2 font-semibold text-white">{row.nom}</td>
                              <td className="px-3 py-2 text-[#7c9aaa] truncate max-w-[180px]">{row.club ?? "—"}</td>
                              <td className="px-3 py-2">
                                {row.licence_valide === true ? (
                                  <span className="text-[#a0f0a0]">OUI</span>
                                ) : row.licence_valide === false ? (
                                  <span className="text-red-400">NON</span>
                                ) : (
                                  <span className="text-[#5c7c8c]">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {row.athlete_id ? (
                                  <span className="inline-block w-2 h-2 rounded-full bg-[#28D7E6]" title="Athlète trouvé" />
                                ) : (
                                  <span className="inline-block w-2 h-2 rounded-full bg-[#3a5c6c]" title="Non lié" />
                                )}
                              </td>
                            </tr>
                          ))}
                          {partantsMap[comp.id].length > 50 && (
                            <tr>
                              <td colSpan={5} className="px-3 py-2 text-center text-[#5c7c8c] font-archivo text-[11px]">
                                … et {partantsMap[comp.id].length - 50} autres partants
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
