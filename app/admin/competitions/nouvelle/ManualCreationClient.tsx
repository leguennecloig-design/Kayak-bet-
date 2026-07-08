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

export default function ManualCreationClient({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typeCompetition, setTypeCompetition] = useState("");

  function isAccepted(file: File): boolean {
    const n = file.name.toLowerCase();
    return n.endsWith(".pdf") || n.endsWith(".txt") || n.endsWith(".md");
  }

  async function handleFile(file: File) {
    if (fileRef.current) fileRef.current.value = "";
    if (!isAccepted(file)) {
      setError("Format non supporté — utilisez .pdf ou .txt");
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
      setResult(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!result) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/import-startlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...result, type_competition: typeCompetition || null }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Erreur import");
      }
      const json = await res.json();
      if (json.warning) alert(json.warning);
      const dest = json.betting_competition_id
        ? `/admin/competitions/${json.betting_competition_id}`
        : "/admin";
      router.push(dest);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setImporting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="font-archivo text-[13px] text-[#7c9aaa] hover:text-white transition-colors"
        >
          ← Choisir un autre mode
        </button>
        <h1 className="font-anton italic uppercase text-white text-[36px] leading-[0.9] mt-4">
          Création<br />
          <span className="text-cyan">manuelle</span>
        </h1>
        <p className="text-[#7c9aaa] font-archivo text-[13px] mt-3 leading-relaxed">
          Importez le PDF de liste de départ FFCK (competFFCK) — la compétition,
          les catégories et les cotes sont créées automatiquement.
        </p>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-[rgba(255,122,69,.1)] border border-[rgba(255,122,69,.3)] rounded-xl px-4 py-3 font-archivo text-[13px] text-[#FF7A45] mb-6">
          {error}
        </div>
      )}

      {/* Étape 1 — Drop zone */}
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
          className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${
            dragging
              ? "border-cyan bg-[rgba(40,215,230,.08)] scale-[1.01]"
              : "border-[var(--border)] hover:border-[rgba(40,215,230,.4)] hover:bg-white/[.02]"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.md"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {/* Icône PDF */}
          <svg
            className={`w-12 h-12 mx-auto mb-5 transition-colors ${dragging ? "text-cyan" : "text-[#3a6a7a]"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="font-grotesk font-semibold text-white text-[15px] mb-1.5">
            Glisser-déposer le PDF de liste de départ
          </p>
          <p className="text-[12px] text-[#7c9aaa]">
            ou cliquer pour sélectionner · .pdf ou .txt competFFCK
          </p>
        </div>
      )}

      {/* Chargement */}
      {parsing && (
        <div className="border border-[var(--border)] rounded-2xl p-14 text-center">
          <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[13px] text-[#9fbac6]">Lecture du PDF et matching des athlètes…</p>
        </div>
      )}

      {/* Étape 2 — Preview + Import */}
      {result && (
        <div className="space-y-5">
          {/* Infos compétition extraites */}
          <div className="bg-[rgba(7,31,45,.6)] border border-[var(--border)] rounded-xl p-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-[10px] text-[#7c9aaa] uppercase tracking-[.1em] mb-1.5">Compétition</p>
              <p className="font-grotesk font-semibold text-white text-[13px] leading-snug">
                {result.nom_competition || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#7c9aaa] uppercase tracking-[.1em] mb-1.5">Lieu</p>
              <p className="font-grotesk font-semibold text-white text-[13px]">
                {result.lieu || "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#7c9aaa] uppercase tracking-[.1em] mb-1.5">Dates</p>
              <p className="font-grotesk font-semibold text-white text-[13px]">
                {result.date_debut && result.date_fin
                  ? `${result.date_debut} → ${result.date_fin}`
                  : result.date_debut ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#7c9aaa] uppercase tracking-[.1em] mb-1.5">Épreuve</p>
              <p className="font-grotesk font-semibold text-white text-[13px]">
                {result.type_epreuve}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#7c9aaa] uppercase tracking-[.1em] mb-1.5">Type</p>
              <select
                value={typeCompetition}
                onChange={(e) => setTypeCompetition(e.target.value)}
                className="bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-lg px-2 py-1.5 text-white font-grotesk font-semibold text-[13px] outline-none appearance-none w-full"
              >
                <option value="" className="bg-[#0a2a3d]">— Choisir —</option>
                <option value="sprint" className="bg-[#0a2a3d]">Sprint normal</option>
                <option value="classique" className="bg-[#0a2a3d]">Classique</option>
                <option value="mass_start" className="bg-[#0a2a3d]">Mass start</option>
                <option value="sprint_finale" className="bg-[#0a2a3d]">Sprint finale</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { value: result.stats.total, label: "Athlètes", color: "text-white" },
              { value: result.stats.matched, label: "Matchés", color: "text-green-400" },
              { value: result.stats.unmatched, label: "Non trouvés", color: "text-orange-400" },
              { value: result.categories.length, label: "Catégories", color: "text-cyan" },
            ].map(({ value, label, color }) => (
              <div
                key={label}
                className="bg-[rgba(40,215,230,.05)] border border-[rgba(40,215,230,.12)] rounded-xl px-3 py-3.5 text-center"
              >
                <p className={`text-[22px] font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-[#7c9aaa] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Liste des catégories */}
          <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-[rgba(7,31,45,.6)] border-b border-[var(--border)]">
              <p className="font-grotesk font-bold text-[11px] uppercase tracking-[.1em] text-[#7c9aaa]">
                Catégories détectées
              </p>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {result.categories.map((cat) => {
                const matchedCount = cat.athletes.filter((a) => a.matched).length;
                const pct =
                  cat.athletes.length > 0
                    ? Math.round((100 * matchedCount) / cat.athletes.length)
                    : 0;
                return (
                  <div key={cat.code} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[.02]">
                    <span className="font-grotesk font-bold text-[11px] text-cyan bg-cyan/10 border border-cyan/20 px-2 py-0.5 rounded-full min-w-[68px] text-center">
                      {cat.code}
                    </span>
                    <span className="font-archivo text-[13px] text-[#9fbac6] flex-1 truncate">
                      {cat.libelle}
                    </span>
                    {cat.isBiplace && (
                      <span className="text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full">
                        C2
                      </span>
                    )}
                    <span className="text-[11px] text-[#7c9aaa] font-mono w-20 text-right">
                      {cat.athletes.length} dép.
                    </span>
                    <span
                      className={`text-[11px] font-mono w-16 text-right ${
                        pct >= 70
                          ? "text-green-400"
                          : pct >= 40
                          ? "text-orange-400"
                          : "text-red-400"
                      }`}
                    >
                      {pct}% ✓
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { setResult(null); setError(null); }}
              className="px-5 py-3 rounded-xl border border-[var(--border)] text-[#9fbac6] hover:text-white text-[13px] font-archivo font-semibold transition-colors"
            >
              ← Autre PDF
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#28D7E6] to-[#1F73FF] font-archivo font-bold text-[14px] text-[#0A2A3D] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-[1px] transition-transform"
            >
              {importing ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#0A2A3D] border-t-transparent rounded-full animate-spin" />
                  Création en cours…
                </>
              ) : (
                `Créer · ${result.categories.length} catégories · ${result.stats.total} athlètes →`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
