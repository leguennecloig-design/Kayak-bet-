"use client";

import { useState, useCallback } from "react";

type FFCKCompetition = {
  ffckCode:       number;
  nom:            string;
  ville:          string;
  dateDebut:      string;
  dateFin:        string;
  niveau:         string;
  competition_id: string | null;
  nb_partants:    number;
};

type InscriptionRow = {
  id: string;
  code_bateau: string;
  nom: string;
  sexe: string | null;
  club: string | null;
  licence_valide: boolean | null;
  athlete_id: string | null;
};

const NIVEAU_STYLE: Record<string, string> = {
  NAT: "text-[#28D7E6] bg-[rgba(40,215,230,.12)] border-[rgba(40,215,230,.3)]",
  REG: "text-[#a0f0a0] bg-[rgba(160,240,160,.10)] border-[rgba(160,240,160,.3)]",
  INT: "text-[#FF7A45] bg-[rgba(255,122,69,.12)] border-[rgba(255,122,69,.3)]",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function SpinIcon({ cls = "w-3.5 h-3.5" }: { cls?: string }) {
  return (
    <svg className={`${cls} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
    </svg>
  );
}

export default function InscriptionsClient() {
  const [competitions, setCompetitions] = useState<FFCKCompetition[]>([]);
  const [scanState,   setScanState]   = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [scanError,   setScanError]   = useState<string | null>(null);

  const [importState, setImportState] = useState<Record<number, "idle" | "loading" | "ok" | "error">>({});
  const [importMsg,   setImportMsg]   = useState<Record<number, string>>({});

  const [partantsMap,     setPartantsMap]     = useState<Record<number, InscriptionRow[]>>({});
  const [partantsLoading, setPartantsLoading] = useState<Record<number, boolean>>({});

  // ── Scan FFCK ────────────────────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    setScanState("loading");
    setScanError(null);
    try {
      const res  = await fetch("/api/admin/inscriptions/scan", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur serveur");
      setCompetitions(json.competitions ?? []);
      setScanState("ok");
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Erreur inconnue");
      setScanState("error");
    }
  }, []);

  // ── Import partants ───────────────────────────────────────────────────────
  // Une fois importé, direction la page de choix d'algo — c'est elle qui
  // calcule les cotes et enchaîne vers la page d'édition habituelle.
  const handleImport = useCallback(async (comp: FFCKCompetition) => {
    setImportState(prev => ({ ...prev, [comp.ffckCode]: "loading" }));
    setImportMsg(prev => ({ ...prev, [comp.ffckCode]: "" }));
    try {
      const res = await fetch(`/api/admin/inscriptions/import/${comp.ffckCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom:       comp.nom,
          ville:     comp.ville,
          dateDebut: comp.dateDebut,
          dateFin:   comp.dateFin,
          niveau:    comp.niveau,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      if (json.competition_id) {
        window.location.href = `/admin/competitions/${json.competition_id}/algo`;
        return;
      }
      setImportState(prev => ({ ...prev, [comp.ffckCode]: "ok" }));
      setImportMsg(prev => ({ ...prev, [comp.ffckCode]: json.message ?? `${json.imported} importés` }));
    } catch (e) {
      setImportState(prev => ({ ...prev, [comp.ffckCode]: "error" }));
      setImportMsg(prev => ({ ...prev, [comp.ffckCode]: e instanceof Error ? e.message : "Erreur" }));
    }
  }, []);

  // ── Voir les partants ─────────────────────────────────────────────────────
  const handleShowPartants = useCallback(async (comp: FFCKCompetition) => {
    if (partantsMap[comp.ffckCode]) {
      setPartantsMap(prev => { const n = { ...prev }; delete n[comp.ffckCode]; return n; });
      return;
    }
    if (!comp.competition_id) return;
    setPartantsLoading(prev => ({ ...prev, [comp.ffckCode]: true }));
    try {
      const res  = await fetch(`/api/admin/inscriptions/list/${comp.competition_id}`);
      if (res.ok) {
        const data = await res.json();
        setPartantsMap(prev => ({ ...prev, [comp.ffckCode]: data }));
      }
    } finally {
      setPartantsLoading(prev => ({ ...prev, [comp.ffckCode]: false }));
    }
  }, [partantsMap]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-anton italic uppercase text-white text-[36px] leading-[0.9]">Inscriptions</h1>
          <p className="font-archivo text-[14px] text-[#7c9aaa] mt-2">
            Partants FFCK · Descente · import direct depuis compet.ffck.org
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleScan}
            disabled={scanState === "loading"}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#28D7E6] to-[#11C2C2] text-[#0A2A3D] font-archivo font-bold text-[13px] px-5 py-3 rounded-[11px] hover:-translate-y-[1px] transition-transform disabled:opacity-50 disabled:translate-y-0"
          >
            {scanState === "loading" ? <SpinIcon /> : (
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 9A8 8 0 0 0 5.3 5.3M4 15a8 8 0 0 0 14.7 3.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
            Charger les compétitions Descente FFCK
          </button>
          {scanError && (
            <p className="font-archivo text-[12px] text-red-400">{scanError}</p>
          )}
        </div>
      </div>

      {/* État initial */}
      {competitions.length === 0 && scanState !== "loading" && (
        <div className="text-center py-20 border border-dashed border-[var(--border-2)] rounded-2xl">
          <p className="font-archivo text-[15px] text-[#5c7c8c]">
            {scanState === "ok"
              ? "Aucune compétition Descente trouvée sur le site FFCK."
              : "Clique sur le bouton pour charger la liste des compétitions Descente depuis FFCK."}
          </p>
        </div>
      )}

      {scanState === "loading" && competitions.length === 0 && (
        <div className="flex items-center justify-center py-20 gap-3 text-[#7c9aaa] font-archivo text-[14px]">
          <SpinIcon cls="w-5 h-5" /> Scraping compet.ffck.org…
        </div>
      )}

      {/* Liste des compétitions FFCK */}
      {competitions.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="font-grotesk font-bold text-[10px] tracking-[.14em] uppercase text-[#5c7c8c]">
            {competitions.length} compétition(s) Descente trouvée(s) sur FFCK
          </p>

          {competitions.map(comp => {
            const iState     = importState[comp.ffckCode] ?? "idle";
            const iMsg       = importMsg[comp.ffckCode];
            const detailOpen = !!partantsMap[comp.ffckCode];
            const nStyle     = NIVEAU_STYLE[comp.niveau] ?? "text-[#7c9aaa] bg-[rgba(124,154,170,.1)] border-[rgba(124,154,170,.3)]";

            return (
              <div
                key={comp.ffckCode}
                className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[16px] px-6 py-5"
              >
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-none">
                    <span className={`font-grotesk font-bold text-[9px] tracking-[.14em] uppercase border rounded-[5px] px-[7px] py-[3px] ${nStyle}`}>
                      {comp.niveau}
                    </span>
                    <span className="font-grotesk font-bold text-[9px] tracking-[.1em] uppercase text-[#5c7c8c]">
                      #{comp.ffckCode}
                    </span>
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="font-archivo font-extrabold text-[15px] text-white truncate">{comp.nom}</div>
                    <div className="font-archivo text-[12px] text-[#5c7c8c] flex items-center gap-3 mt-0.5 flex-wrap">
                      {comp.ville && <span>{comp.ville.replace(/^\d{5}\s+/, "")}</span>}
                      <span>{fmtDate(comp.dateDebut)} → {fmtDate(comp.dateFin)}</span>
                      {comp.nb_partants > 0 && (
                        <span className="text-[#a0f0a0] font-semibold">{comp.nb_partants} partants importés</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-none">
                    {comp.nb_partants > 0 && (
                      <button
                        onClick={() => handleShowPartants(comp)}
                        disabled={partantsLoading[comp.ffckCode]}
                        className="font-archivo font-semibold text-[12px] text-[#7c9aaa] border border-[var(--border-2)] px-3 py-2 rounded-[9px] hover:text-white hover:border-[rgba(40,215,230,.3)] transition-colors"
                      >
                        {partantsLoading[comp.ffckCode] ? <SpinIcon cls="w-3 h-3" /> : detailOpen ? "Masquer" : "Voir la liste"}
                      </button>
                    )}
                    <button
                      onClick={() => handleImport(comp)}
                      disabled={iState === "loading"}
                      className={`inline-flex items-center gap-1.5 font-archivo font-bold text-[12px] px-4 py-2 rounded-[9px] border transition-colors disabled:opacity-50 ${
                        iState === "ok"
                          ? "text-[#a0f0a0] border-[rgba(160,240,160,.3)] bg-[rgba(160,240,160,.08)]"
                          : iState === "error"
                            ? "text-red-400 border-red-500/30 bg-red-500/10"
                            : "text-[#28D7E6] border-[rgba(40,215,230,.3)] hover:bg-[rgba(40,215,230,.08)]"
                      }`}
                    >
                      {iState === "loading" ? <SpinIcon cls="w-3 h-3" /> : null}
                      {iState === "loading" ? "Import…" : iState === "error" ? "Erreur" : comp.nb_partants > 0 ? "Réimporter" : "Importer les partants"}
                    </button>
                  </div>
                </div>

                {/* Message import (redirection automatique vers le choix d'algo en cas de succès) */}
                {iMsg && (
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <p className={`font-archivo text-[12px] ${iState === "error" ? "text-red-400" : "text-[#a0f0a0]"}`}>
                      {iMsg}
                    </p>
                  </div>
                )}

                {/* Tableau des partants */}
                {detailOpen && partantsMap[comp.ffckCode] && (
                  <div className="mt-5 border-t border-[var(--border-2)] pt-4">
                    <p className="font-grotesk font-bold text-[10px] tracking-[.12em] uppercase text-[#5c7c8c] mb-3">
                      {partantsMap[comp.ffckCode].length} partants
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full font-archivo text-[12px]">
                        <thead>
                          <tr className="border-b border-[var(--border-2)]">
                            {["Code bateau", "Nom", "Club", "Lic.", "Lié"].map(h => (
                              <th key={h} className="px-3 py-2 text-left font-grotesk font-bold text-[9.5px] tracking-[.1em] uppercase text-[#5c7c8c]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {partantsMap[comp.ffckCode].slice(0, 50).map(row => (
                            <tr key={row.id} className="border-b border-[var(--border-2)] hover:bg-white/[.015]">
                              <td className="px-3 py-2 font-mono text-[11px] text-[#7c9aaa]">{row.code_bateau}</td>
                              <td className="px-3 py-2 font-semibold text-white">{row.nom}</td>
                              <td className="px-3 py-2 text-[#7c9aaa] truncate max-w-[180px]">{row.club ?? "—"}</td>
                              <td className="px-3 py-2">
                                {row.licence_valide === true
                                  ? <span className="text-[#a0f0a0] font-bold">✓</span>
                                  : row.licence_valide === false
                                    ? <span className="text-red-400">✗</span>
                                    : <span className="text-[#5c7c8c]">—</span>}
                              </td>
                              <td className="px-3 py-2">
                                <span title={row.athlete_id ? "Athlète dans la base" : "Non lié"}
                                  className={`inline-block w-2 h-2 rounded-full ${row.athlete_id ? "bg-[#28D7E6]" : "bg-[#3a5c6c]"}`}
                                />
                              </td>
                            </tr>
                          ))}
                          {partantsMap[comp.ffckCode].length > 50 && (
                            <tr>
                              <td colSpan={5} className="px-3 py-2 text-center text-[#5c7c8c] font-archivo text-[11px]">
                                … et {partantsMap[comp.ffckCode].length - 50} autres
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
