"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type ParsedAthlete = {
  dossard: number;
  nom: string;
  club: string;
  cote_top1: number | null;
  cote_top3: number | null;
  cote_top5: number | null;
  cote_top10: number | null;
  noData: boolean;
};

type ParsedCategory = {
  code: string;
  libelle: string;
  athletes: ParsedAthlete[];
};

type ParseResult = {
  nom_competition: string;
  lieu: string;
  date_debut: string | null;
  date_fin: string | null;
  categories: ParsedCategory[];
  stats: { total: number; categories: number };
  errors: string[];
};

export default function ImportCotesFileClient({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editNom, setEditNom] = useState("");
  const [editLieu, setEditLieu] = useState("");
  const [editDateDebut, setEditDateDebut] = useState("");
  const [parisOuvertsA, setParisOuvertsA] = useState("");

  function isAccepted(file: File): boolean {
    return file.name.toLowerCase().endsWith(".txt");
  }

  async function handleFile(file: File) {
    if (fileRef.current) fileRef.current.value = "";
    if (!isAccepted(file)) {
      setError("Format non supporté — utilise un fichier .txt");
      return;
    }
    setParsing(true);
    setError(null);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/parse-cotes-file", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Erreur serveur");
      }
      const json: ParseResult = await res.json();
      setResult(json);
      setEditNom(json.nom_competition);
      setEditLieu(json.lieu);
      setEditDateDebut(json.date_debut ?? "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!result) return;
    if (!editNom.trim()) {
      setError("Le nom de la compétition est requis.");
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/import-cotes-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom_competition: editNom.trim(),
          lieu: editLieu.trim() || null,
          date_debut: editDateDebut.trim() || null,
          date_fin: result.date_fin,
          categories: result.categories,
          paris_ouverts_a: parisOuvertsA ? new Date(parisOuvertsA).toISOString() : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur import");
      router.push(`/admin/competitions/${json.competition_id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setImporting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="font-archivo text-[13px] text-[#7c9aaa] hover:text-white transition-colors"
        >
          ← Choisir un autre mode
        </button>
        <h1 className="font-anton italic uppercase text-white text-[36px] leading-[0.9] mt-4">
          Import<br />
          <span className="text-cyan">cotes précalculées</span>
        </h1>
        <p className="text-[#7c9aaa] font-archivo text-[13px] mt-3 leading-relaxed">
          Importe un fichier .txt contenant déjà la liste de départ ET les cotes
          (Top1/Top3/Top5/Top10) calculées en externe — aucun recalcul n&apos;est fait,
          les valeurs du fichier sont utilisées telles quelles.
        </p>
      </div>

      {error && (
        <div className="bg-[rgba(255,122,69,.1)] border border-[rgba(255,122,69,.3)] rounded-xl px-4 py-3 font-archivo text-[13px] text-[#FF7A45] mb-6">
          {error}
        </div>
      )}

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
            accept=".txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
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
            Glisser-déposer le fichier .txt de cotes
          </p>
          <p className="text-[12px] text-[#7c9aaa]">
            ou cliquer pour sélectionner
          </p>
        </div>
      )}

      {parsing && (
        <div className="border border-[var(--border)] rounded-2xl p-14 text-center">
          <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[13px] text-[#9fbac6]">Lecture du fichier…</p>
        </div>
      )}

      {result && (
        <div className="space-y-5">
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
              <p className="text-[10px] text-[#7c9aaa] uppercase tracking-[.1em] mb-1.5">Date</p>
              <input
                type="date"
                value={editDateDebut}
                onChange={(e) => setEditDateDebut(e.target.value)}
                className="bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-lg px-2 py-1.5 text-white font-grotesk font-semibold text-[13px] outline-none w-full"
              />
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

          <div className="grid grid-cols-3 gap-3">
            {[
              { value: result.stats.total, label: "Athlètes/bateaux", color: "text-white" },
              { value: result.stats.categories, label: "Catégories", color: "text-cyan" },
              { value: result.errors.length, label: "Lignes ignorées", color: result.errors.length > 0 ? "text-orange-400" : "text-green-400" },
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

          {result.errors.length > 0 && (
            <div className="bg-[rgba(255,122,69,.06)] border border-[rgba(255,122,69,.2)] rounded-xl p-4">
              <p className="font-grotesk font-bold text-[11px] uppercase tracking-[.1em] text-[#FF7A45] mb-2">
                Lignes non reconnues (ignorées)
              </p>
              <div className="text-[11px] font-archivo text-[#e0a080] space-y-0.5 max-h-32 overflow-y-auto">
                {result.errors.slice(0, 10).map((err, i) => <p key={i}>{err}</p>)}
                {result.errors.length > 10 && <p>… et {result.errors.length - 10} autre(s)</p>}
              </div>
            </div>
          )}

          <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-[rgba(7,31,45,.6)] border-b border-[var(--border)]">
              <p className="font-grotesk font-bold text-[11px] uppercase tracking-[.1em] text-[#7c9aaa]">
                Catégories détectées
              </p>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {result.categories.map((cat) => (
                <div key={cat.code} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[.02]">
                  <span className="font-grotesk font-bold text-[11px] text-cyan bg-cyan/10 border border-cyan/20 px-2 py-0.5 rounded-full min-w-[68px] text-center">
                    {cat.code}
                  </span>
                  <span className="font-archivo text-[13px] text-[#9fbac6] flex-1 truncate">
                    {cat.libelle}
                  </span>
                  <span className="text-[11px] text-[#7c9aaa] font-mono w-20 text-right">
                    {cat.athletes.length} dép.
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { setResult(null); setError(null); }}
              className="px-5 py-3 rounded-xl border border-[var(--border)] text-[#9fbac6] hover:text-white text-[13px] font-archivo font-semibold transition-colors"
            >
              ← Autre fichier
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
                `Créer · ${result.categories.length} catégories · ${result.stats.total} participants →`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
