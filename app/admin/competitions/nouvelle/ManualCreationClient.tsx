"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { parseResultFile, type ParseResult as SpecialParseResult } from "@/lib/algo/result-parser";

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

  // Champs extraits du PDF, modifiables avant création — le parsing peut se
  // tromper (nom/date mal détectés) et deux épreuves distinctes peuvent
  // partager le même nom/date, d'où le besoin de pouvoir les corriger ici.
  const [editNom,         setEditNom]         = useState("");
  const [editLieu,        setEditLieu]        = useState("");
  const [editDateDebut,   setEditDateDebut]   = useState("");
  const [editDateFin,     setEditDateFin]     = useState("");
  const [editTypeEpreuve, setEditTypeEpreuve] = useState("");
  // Optionnel : programme l'heure à partir de laquelle la startlist/les
  // paris deviennent accessibles, indépendamment de la publication.
  const [parisOuvertsA, setParisOuvertsA] = useState("");

  // Sprint Finale / Mass Start : fichier optionnel des résultats qualifs /
  // classique du week-end, uploadé au moment même de la création plutôt que
  // dans un second temps sur /admin/cotes.
  const specialFileRef = useRef<HTMLInputElement>(null);
  const [specialFile,    setSpecialFile]    = useState<File | null>(null);
  const [specialPreview, setSpecialPreview] = useState<SpecialParseResult | null>(null);
  const [specialError,   setSpecialError]   = useState("");

  async function handleSpecialFile(file: File) {
    setSpecialFile(file);
    setSpecialError("");
    const content = await file.text();
    const parsed = parseResultFile(content, file.name);
    setSpecialPreview(parsed);
  }

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
      const json: ParseResult = await res.json();
      setResult(json);
      setEditNom(json.nom_competition);
      setEditLieu(json.lieu);
      setEditDateDebut(json.date_debut ?? "");
      setEditDateFin(json.date_fin ?? "");
      setEditTypeEpreuve(json.type_epreuve);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setParsing(false);
    }
  }

  async function handleImport(force = false) {
    if (!result) return;
    if (!typeCompetition) {
      setError("Choisis l'algo de cotes (Classique / Sprint / Mass start / Sprint finale) avant d'importer.");
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/import-startlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...result,
          nom_competition: editNom.trim() || result.nom_competition,
          lieu: editLieu.trim() || result.lieu,
          date_debut: editDateDebut.trim() || null,
          date_fin: editDateFin.trim() || null,
          type_epreuve: editTypeEpreuve.trim() || result.type_epreuve,
          type_competition: typeCompetition || null,
          algo_type: typeCompetition || null,
          special_results: specialPreview?.data ?? null,
          paris_ouverts_a: parisOuvertsA ? new Date(parisOuvertsA).toISOString() : null,
          force,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        if (j.needsConfirmation && confirm(j.error)) {
          return handleImport(true);
        }
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
          {/* Infos compétition extraites — modifiables : le parsing du PDF peut se
              tromper, et deux épreuves distinctes (ex: Manche 1 / Finale) peuvent
              partager le même nom+date, d'où le besoin de pouvoir corriger avant création. */}
          <div className="bg-[rgba(7,31,45,.6)] border border-[var(--border)] rounded-xl p-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <p className="text-[10px] text-[#7c9aaa] uppercase tracking-[.1em] mb-1.5">Compétition</p>
              <input
                value={editNom}
                onChange={(e) => setEditNom(e.target.value)}
                className="bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-lg px-2 py-1.5 text-white font-grotesk font-semibold text-[13px] outline-none w-full"
              />
            </div>
            <div>
              <p className="text-[10px] text-[#7c9aaa] uppercase tracking-[.1em] mb-1.5">Lieu</p>
              <input
                value={editLieu}
                onChange={(e) => setEditLieu(e.target.value)}
                className="bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-lg px-2 py-1.5 text-white font-grotesk font-semibold text-[13px] outline-none w-full"
              />
            </div>
            <div>
              <p className="text-[10px] text-[#7c9aaa] uppercase tracking-[.1em] mb-1.5">Date début</p>
              <input
                value={editDateDebut}
                onChange={(e) => setEditDateDebut(e.target.value)}
                placeholder="JJ/MM/AAAA"
                className="bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-lg px-2 py-1.5 text-white font-grotesk font-semibold text-[13px] outline-none w-full"
              />
            </div>
            <div>
              <p className="text-[10px] text-[#7c9aaa] uppercase tracking-[.1em] mb-1.5">Date fin</p>
              <input
                value={editDateFin}
                onChange={(e) => setEditDateFin(e.target.value)}
                placeholder="JJ/MM/AAAA"
                className="bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-lg px-2 py-1.5 text-white font-grotesk font-semibold text-[13px] outline-none w-full"
              />
            </div>
            <div>
              <p className="text-[10px] text-[#7c9aaa] uppercase tracking-[.1em] mb-1.5">
                Épreuve <span className="normal-case text-[#5c7c8c]">(distingue deux imports du même jour)</span>
              </p>
              <input
                value={editTypeEpreuve}
                onChange={(e) => setEditTypeEpreuve(e.target.value)}
                className="bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-lg px-2 py-1.5 text-white font-grotesk font-semibold text-[13px] outline-none w-full"
              />
            </div>
            <div>
              <p className="text-[10px] text-[#7c9aaa] uppercase tracking-[.1em] mb-1.5">Algo de cotes *</p>
              <select
                value={typeCompetition}
                onChange={(e) => setTypeCompetition(e.target.value)}
                className={`bg-[rgba(255,255,255,.05)] border rounded-lg px-2 py-1.5 text-white font-grotesk font-semibold text-[13px] outline-none appearance-none w-full ${typeCompetition ? "border-[var(--border-2)]" : "border-[rgba(255,122,69,.5)]"}`}
              >
                <option value="" className="bg-[#0a2a3d]">— Choisir —</option>
                <option value="classique" className="bg-[#0a2a3d]">Classique</option>
                <option value="sprint" className="bg-[#0a2a3d]">Sprint</option>
                <option value="mass_start" className="bg-[#0a2a3d]">Mass start</option>
                <option value="sprint_finale" className="bg-[#0a2a3d]">Sprint finale</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[10px] text-[#7c9aaa] uppercase tracking-[.1em] mb-1.5">
                Ouverture des paris <span className="normal-case text-[#5c7c8c]">(optionnel — sinon dès la publication)</span>
              </p>
              <input
                type="datetime-local"
                value={parisOuvertsA}
                onChange={(e) => setParisOuvertsA(e.target.value)}
                className="bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-lg px-2 py-1.5 text-white font-grotesk font-semibold text-[13px] outline-none w-full"
              />
            </div>
          </div>

          {/* Sprint Finale / Mass Start — résultats qualifs / classique, optionnels à la création */}
          {(typeCompetition === "sprint_finale" || typeCompetition === "mass_start") && (
            <div className="bg-[rgba(179,157,219,.05)] border border-[rgba(179,157,219,.2)] rounded-xl p-5">
              <p className="font-grotesk font-bold text-[11px] uppercase tracking-[.1em] text-[#b39ddb] mb-2">
                {typeCompetition === "sprint_finale"
                  ? "Résultats des qualifs (optionnel)"
                  : "Résultats de la classique du week-end (optionnel)"}
              </p>
              <p className="font-archivo text-[12px] text-[#7c9aaa] mb-3">
                {typeCompetition === "sprint_finale"
                  ? "60% qualifs + 40% algo v3. Sans fichier, les cotes restent 100% algo v3 (comme un format standard)."
                  : "80% classique + 20% algo v3. Sans fichier, les cotes restent 100% algo v3 (comme un format standard)."}
                {" "}Formats acceptés : CSV, TXT, JSON.
              </p>
              <label className="inline-flex items-center gap-2 font-archivo font-semibold text-[12px] text-[#b39ddb] border border-[rgba(179,157,219,.35)] rounded-[9px] px-3.5 py-2 cursor-pointer hover:bg-[rgba(179,157,219,.08)] transition-colors">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                  <path d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {specialFile ? specialFile.name : "Choisir un fichier"}
                <input
                  ref={specialFileRef}
                  type="file"
                  accept=".csv,.txt,.json"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSpecialFile(f); }}
                />
              </label>

              {specialPreview && (
                <div className="mt-3">
                  {specialPreview.data.length > 0 && (
                    <p className="font-archivo text-[12px] text-[#7c9aaa]">
                      ✓ {specialPreview.data.length} ligne{specialPreview.data.length > 1 ? "s" : ""} parsée{specialPreview.data.length > 1 ? "s" : ""}
                      {" "}({specialPreview.format_detected}) · {[...new Set(specialPreview.data.map(r => r.categorie))].length} catégorie(s)
                    </p>
                  )}
                  {specialPreview.errors.length > 0 && (
                    <div className="text-[11px] font-archivo text-red-400 mt-1 space-y-0.5">
                      {specialPreview.errors.slice(0, 5).map((err, i) => <p key={i}>{err}</p>)}
                      {specialPreview.errors.length > 5 && <p>… et {specialPreview.errors.length - 5} autre(s)</p>}
                    </div>
                  )}
                </div>
              )}
              {specialError && (
                <p className="font-archivo text-[12px] text-red-400 mt-2">{specialError}</p>
              )}
            </div>
          )}

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
              onClick={() => handleImport()}
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
