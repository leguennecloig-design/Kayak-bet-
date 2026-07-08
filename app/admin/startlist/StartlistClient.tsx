"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type MatchedAthlete = {
  dossard: number;
  nom: string;
  prenom: string;
  club: string;
  depart: string;
  isBiplace: boolean;
  athlete_id: string | null;
  code_bateau: string | null;
  rang_national: number | null;
  matched: boolean;
};

type ParsedCategory = {
  code: string;
  libelle: string;
  isBiplace: boolean;
  athletes: MatchedAthlete[];
};

type ParseResult = {
  nom_competition: string;
  lieu: string;
  date_debut: string | null;
  date_fin: string | null;
  type_epreuve: string;
  categories: ParsedCategory[];
  stats: { total: number; matched: number; unmatched: number };
};

export default function StartlistClient() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>("ALL");
  const [showBiplace, setShowBiplace] = useState(false);

  async function handleFile(file: File) {
    // Réinitialiser la valeur de l'input pour permettre de re-sélectionner le même fichier
    if (fileRef.current) fileRef.current.value = "";
    if (!file.name.endsWith(".pdf")) {
      setError("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    setParsing(true);
    setError(null);
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/admin/parse-startlist", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Erreur serveur");
      }
      const data = await res.json();
      setResult(data);
      setFilterCat("ALL");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setParsing(false);
    }
  }

  async function handleImport(force = false) {
    if (!result) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/import-startlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...result, force }),
      });
      if (!res.ok) {
        const j = await res.json();
        if (j.needsConfirmation && confirm(j.error)) {
          return handleImport(true);
        }
        throw new Error(j.error ?? "Erreur import");
      }
      router.push("/admin/cotes");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setImporting(false);
    }
  }

  const allCodes = result?.categories.map((c) => c.code) ?? [];
  const visibleCats = result?.categories.filter((cat) => {
    if (!showBiplace && cat.isBiplace) return false;
    if (filterCat !== "ALL" && cat.code !== filterCat) return false;
    return true;
  }) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-grotesk font-bold text-2xl text-white mb-1">Import Startlist</h1>
        <p className="text-sm text-[#9fbac6]">
          Importez un PDF de liste de départ FFCK pour créer la compétition et calculer les cotes.
        </p>
      </div>

      {/* Zone upload */}
      {!result && !parsing && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${
            dragging
              ? "border-cyan bg-[rgba(40,215,230,.08)]"
              : "border-[var(--border)] hover:border-[#3a7a8a] hover:bg-white/[.03]"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <svg className="w-10 h-10 mx-auto mb-4 text-[#3a7a8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="font-grotesk font-semibold text-white text-sm mb-1">
            Glisser-déposer le PDF de liste de départ
          </p>
          <p className="text-xs text-[#9fbac6]">ou cliquer pour sélectionner</p>
        </div>
      )}

      {/* Chargement */}
      {parsing && (
        <div className="border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#9fbac6]">Extraction du PDF et matching des athlètes…</p>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Résultat */}
      {result && (
        <div className="space-y-6">
          {/* Infos compétition */}
          <div className="bg-[rgba(7,31,45,.6)] border border-[var(--border)] rounded-xl p-5 flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-[#9fbac6] mb-1 uppercase tracking-wider">Compétition</p>
              <p className="font-grotesk font-semibold text-white">{result.nom_competition || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-[#9fbac6] mb-1 uppercase tracking-wider">Lieu</p>
              <p className="font-grotesk font-semibold text-white">{result.lieu || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-[#9fbac6] mb-1 uppercase tracking-wider">Dates</p>
              <p className="font-grotesk font-semibold text-white">
                {result.date_debut && result.date_fin
                  ? `${result.date_debut} → ${result.date_fin}`
                  : result.date_debut ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#9fbac6] mb-1 uppercase tracking-wider">Épreuve</p>
              <p className="font-grotesk font-semibold text-white">{result.type_epreuve}</p>
            </div>
          </div>

          {/* Stats matching */}
          <div className="flex gap-4 flex-wrap">
            <div className="bg-[rgba(40,215,230,.08)] border border-[rgba(40,215,230,.2)] rounded-xl px-5 py-3 text-center min-w-[100px]">
              <p className="text-2xl font-bold text-cyan">{result.stats.total}</p>
              <p className="text-xs text-[#9fbac6]">Athlètes</p>
            </div>
            <div className="bg-[rgba(40,215,230,.08)] border border-[rgba(40,215,230,.2)] rounded-xl px-5 py-3 text-center min-w-[100px]">
              <p className="text-2xl font-bold text-green-400">{result.stats.matched}</p>
              <p className="text-xs text-[#9fbac6]">Matchés</p>
            </div>
            <div className="bg-[rgba(40,215,230,.08)] border border-[rgba(40,215,230,.2)] rounded-xl px-5 py-3 text-center min-w-[100px]">
              <p className="text-2xl font-bold text-orange-400">{result.stats.unmatched}</p>
              <p className="text-xs text-[#9fbac6]">Non trouvés</p>
            </div>
            <div className="bg-[rgba(40,215,230,.08)] border border-[rgba(40,215,230,.2)] rounded-xl px-5 py-3 text-center min-w-[100px]">
              <p className="text-2xl font-bold text-white">{result.categories.filter(c => !c.isBiplace).length}</p>
              <p className="text-xs text-[#9fbac6]">Catégories (cotes)</p>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => { setFilterCat("ALL"); setShowBiplace(false); }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filterCat === "ALL" && !showBiplace
                  ? "border-cyan bg-cyan/10 text-cyan"
                  : "border-[var(--border)] text-[#9fbac6] hover:border-[#3a7a8a]"
              }`}
            >
              Monoplaces
            </button>
            <button
              onClick={() => { setFilterCat("ALL"); setShowBiplace(true); }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                showBiplace && filterCat === "ALL"
                  ? "border-cyan bg-cyan/10 text-cyan"
                  : "border-[var(--border)] text-[#9fbac6] hover:border-[#3a7a8a]"
              }`}
            >
              Biplaces
            </button>
            {allCodes.filter(c => {
              const cat = result.categories.find(x => x.code === c);
              return cat && cat.isBiplace === showBiplace;
            }).map((code) => (
              <button
                key={code}
                onClick={() => setFilterCat(code)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  filterCat === code
                    ? "border-cyan bg-cyan/10 text-cyan"
                    : "border-[var(--border)] text-[#9fbac6] hover:border-[#3a7a8a]"
                }`}
              >
                {code}
              </button>
            ))}
          </div>

          {/* Tables par catégorie */}
          {visibleCats.map((cat) => (
            <div key={cat.code} className="border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-[rgba(7,31,45,.6)] border-b border-[var(--border)] flex items-center gap-3">
                <span className="font-grotesk font-bold text-white text-sm">{cat.libelle}</span>
                <span className="text-xs bg-[rgba(40,215,230,.1)] text-cyan border border-[rgba(40,215,230,.2)] px-2 py-0.5 rounded-full">
                  {cat.code}
                </span>
                {cat.isBiplace && (
                  <span className="text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full">
                    Biplace
                  </span>
                )}
                <span className="ml-auto text-xs text-[#9fbac6]">
                  {cat.athletes.filter(a => a.matched).length}/{cat.athletes.length} matchés
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[10px] text-[#9fbac6] uppercase tracking-wider">
                    <th className="px-4 py-2 text-left w-12">Dos.</th>
                    <th className="px-4 py-2 text-left">Nom</th>
                    <th className="px-4 py-2 text-left hidden md:table-cell">Club</th>
                    <th className="px-4 py-2 text-right hidden md:table-cell">Rang</th>
                    <th className="px-4 py-2 text-center">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.athletes.map((ath, idx) => (
                    <tr
                      key={`${ath.dossard}-${idx}`}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-white/[.02]"
                    >
                      <td className="px-4 py-2 text-[#9fbac6] font-mono text-xs">{ath.dossard}</td>
                      <td className="px-4 py-2">
                        <span className="text-white font-medium">{ath.nom}</span>
                        {ath.prenom && <span className="text-[#9fbac6] ml-1">{ath.prenom}</span>}
                      </td>
                      <td className="px-4 py-2 text-[#9fbac6] text-xs hidden md:table-cell truncate max-w-[180px]">
                        {ath.club}
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-[#9fbac6] hidden md:table-cell font-mono">
                        {ath.rang_national != null ? `#${ath.rang_national}` : "—"}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {ath.matched ? (
                          <span className="inline-block w-2 h-2 rounded-full bg-green-400" title="Trouvé" />
                        ) : (
                          <span className="inline-block w-2 h-2 rounded-full bg-orange-400" title="Non trouvé" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setResult(null); setError(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-[#9fbac6] hover:text-white text-sm font-archivo font-semibold transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => handleImport()}
              disabled={importing}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan to-blue font-archivo font-bold text-[13px] text-deep disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importing ? (
                <>
                  <span className="w-4 h-4 border-2 border-deep border-t-transparent rounded-full animate-spin" />
                  Import en cours…
                </>
              ) : (
                "Importer et calculer les cotes"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
