"use client";

import { useRef, useState } from "react";

type ImportSummary = {
  ok: boolean;
  categories: number;
  qualified: number;
  nonQualified: number;
  abs: number;
  unmatched: string[];
  parseErrors: string[];
};

// Import des résultats pour une compétition QUALIF (voir
// competitions.marche_qualif_finale) — remplace ResultatsSection pour ce
// type de compétition : pas de rang/temps/club, juste la liste des
// qualifiés par catégorie (voir lib/algo/qualif-results-parser.ts). Tout
// participant du départ non listé en "Qualifiés" ni "Abs" est automatiquement
// marqué non qualifié (perdu) au règlement.
export default function QualifResultsSection({ competitionId, competitionNom }: { competitionId: string; competitionNom: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<"idle" | "uploading" | "ok" | "error">("idle");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportState("uploading");
    setError("");
    setSummary(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`/api/admin/competitions/${competitionId}/import-qualif-results`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
      setSummary(json);
      setImportState(json.unmatched?.length > 0 ? "error" : "ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setImportState("error");
    }

    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[18px] p-6 mt-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-grotesk font-bold text-[10px] tracking-[.18em] uppercase text-[#7c9aaa]">
            Résultats qualif
          </h2>
          <p className="font-archivo text-[12px] text-[#5c7c8c] mt-0.5">
            Importe juste la liste des qualifiés en finale par catégorie — {competitionNom}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importState === "uploading"}
            className={`inline-flex items-center gap-2 font-archivo font-bold text-[12.5px] px-4 py-2 rounded-[10px] border transition-colors disabled:opacity-50 ${
              importState === "ok"
                ? "text-[#a0f0a0] border-[rgba(160,240,160,.3)] bg-[rgba(160,240,160,.07)]"
                : importState === "error"
                  ? "text-red-400 border-red-500/30 bg-red-500/08"
                  : "text-[#28D7E6] border-[rgba(40,215,230,.3)] hover:bg-[rgba(40,215,230,.08)]"
            }`}
          >
            {importState === "uploading" ? "Import…" : "Importer la liste des qualifiés"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[rgba(255,122,69,.1)] border border-[rgba(255,122,69,.3)] rounded-xl px-4 py-3 font-archivo text-[13px] text-[#FF7A45] mb-4">
          {error}
        </div>
      )}

      {summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: summary.qualified, label: "Qualifiés", color: "text-cyan" },
              { value: summary.nonQualified, label: "Non qualifiés", color: "text-white" },
              { value: summary.abs, label: "Absents", color: "text-[#7c9aaa]" },
            ].map(({ value, label, color }) => (
              <div key={label} className="bg-[rgba(40,215,230,.05)] border border-[rgba(40,215,230,.12)] rounded-xl px-3 py-3.5 text-center">
                <p className={`text-[22px] font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-[#7c9aaa] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {(summary.unmatched.length > 0 || summary.parseErrors.length > 0) && (
            <div className="bg-[rgba(255,122,69,.06)] border border-[rgba(255,122,69,.2)] rounded-xl p-4">
              <p className="font-grotesk font-bold text-[11px] uppercase tracking-[.1em] text-[#FF7A45] mb-2">
                À vérifier
              </p>
              <div className="text-[11px] font-archivo text-[#e0a080] space-y-0.5 max-h-32 overflow-y-auto">
                {[...summary.unmatched, ...summary.parseErrors].slice(0, 15).map((msg, i) => <p key={i}>{msg}</p>)}
              </div>
            </div>
          )}
        </div>
      )}

      {!summary && !error && (
        <p className="font-archivo text-[13px] text-[#5c7c8c]">
          Format attendu : "### &lt;Libellé&gt; (&lt;CODE&gt;)" puis "Qualifiés :" suivi d&apos;un
          nom par ligne, et optionnellement "Abs : Nom1, Nom2". Tout participant du
          départ non listé est automatiquement marqué non qualifié.
        </p>
      )}
    </div>
  );
}
