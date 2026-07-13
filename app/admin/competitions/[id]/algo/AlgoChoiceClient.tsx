"use client";

import { useState } from "react";

const RACE_TYPES_WITH_FILE = new Set(["mass_start", "sprint_finale"]);

const ALGO_OPTIONS = [
  { value: "classique", label: "Classique", desc: "Descente classique — national + numérique + comparatif de catégorie." },
  { value: "sprint", label: "Sprint", desc: "Sprint normal — même moteur, historique national sprint." },
  { value: "mass_start", label: "Mass start", desc: "Combine le score de base avec les résultats de la classique du week-end." },
  { value: "sprint_finale", label: "Sprint finale", desc: "Combine le score de base avec les résultats des qualifications sprint." },
];

export default function AlgoChoiceClient({
  competitionId,
  competitionNom,
  initialAlgoType,
  inscriptionsCount,
}: {
  competitionId: string;
  competitionNom: string;
  initialAlgoType: string;
  inscriptionsCount: number;
}) {
  const [algoType, setAlgoType] = useState(initialAlgoType);
  const [priorRoundFile, setPriorRoundFile] = useState<File | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const needsFile = RACE_TYPES_WITH_FILE.has(algoType);

  async function handleSubmit() {
    if (!algoType) {
      setState("error");
      setError("Choisis un algo avant de continuer.");
      return;
    }
    if (needsFile && !priorRoundFile) {
      setState("error");
      setError(
        algoType === "mass_start"
          ? "Joins les résultats de la classique pour calculer les cotes mass start."
          : "Joins les résultats du sprint normal pour calculer les cotes sprint finale."
      );
      return;
    }
    setState("loading");
    setError("");
    try {
      // Persiste algo_type sur la compétition (source de vérité, relu par la
      // page d'édition et par tout futur recalcul).
      const patchRes = await fetch(`/api/admin/competitions/${competitionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ algo_type: algoType, type_competition: algoType }),
      });
      if (!patchRes.ok) throw new Error("Impossible d'enregistrer l'algo choisi");

      const fd = new FormData();
      fd.append("algo_type", algoType);
      if (needsFile && priorRoundFile) fd.append("file", priorRoundFile);
      const res = await fetch(`/api/admin/competitions/${competitionId}/calculate-cotes`, {
        method: "POST",
        body: fd,
      });
      const text = await res.text();
      let json: Record<string, unknown> = {};
      try { json = JSON.parse(text); } catch { throw new Error(`Réponse invalide du serveur (${res.status})`); }
      if (!res.ok) throw new Error((json.error as string) ?? "Erreur serveur");

      // Direction la page d'édition habituelle.
      window.location.href = `/admin/competitions/${competitionId}`;
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    }
  }

  return (
    <div className="max-w-2xl">
      <a href="/admin" className="font-archivo text-[13px] text-[#7c9aaa] hover:text-white transition-colors">
        ← Toutes les compétitions
      </a>

      <div className="mt-5 mb-8">
        <h1 className="font-anton italic uppercase text-white text-[36px] leading-[0.9]">
          Choix de <span className="text-cyan">l&apos;algo</span>
        </h1>
        <p className="font-archivo text-[14px] text-[#7c9aaa] mt-2">
          {competitionNom} · {inscriptionsCount} partant{inscriptionsCount !== 1 ? "s" : ""} importé{inscriptionsCount !== 1 ? "s" : ""}
        </p>
        <p className="font-archivo text-[13px] text-[#5c7c8c] mt-3 leading-relaxed">
          Choisis quel moteur de cotes utiliser pour cette compétition. Une fois calculées, tu arriveras
          sur la page habituelle (nom, brouillon/publication, participants, clôture des paris…).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {ALGO_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setAlgoType(opt.value)}
            className={`text-left rounded-[16px] p-5 border transition-colors ${
              algoType === opt.value
                ? "border-[rgba(40,215,230,.5)] bg-[rgba(40,215,230,.08)]"
                : "border-[var(--border-2)] bg-[rgba(255,255,255,.03)] hover:border-[rgba(40,215,230,.3)]"
            }`}
          >
            <p className={`font-archivo font-extrabold text-[15px] ${algoType === opt.value ? "text-cyan" : "text-white"}`}>
              {opt.label}
            </p>
            <p className="font-archivo text-[12px] text-[#7c9aaa] mt-1.5 leading-relaxed">{opt.desc}</p>
          </button>
        ))}
      </div>

      {needsFile && (
        <div className="mb-6 bg-[rgba(40,215,230,.04)] border border-[rgba(40,215,230,.2)] rounded-[12px] p-4">
          <p className="font-grotesk font-bold text-[9.5px] tracking-[.14em] uppercase text-[#28D7E6] mb-2">
            {algoType === "mass_start" ? "Résultats de la classique" : "Résultats du sprint normal"}
          </p>
          <p className="font-archivo text-[12px] text-[#7c9aaa] mb-3">
            Fichier PDF ou TXT (même format que l&apos;import de résultats) — requis pour calculer les
            cotes {algoType === "mass_start" ? "mass start" : "sprint finale"}.
          </p>
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={(e) => setPriorRoundFile(e.target.files?.[0] ?? null)}
            className="font-archivo text-[12.5px] text-[#9fbac6] file:mr-3 file:py-1.5 file:px-3 file:rounded-[8px] file:border-0 file:bg-[rgba(40,215,230,.15)] file:text-[#28D7E6] file:font-bold file:text-[12px]"
          />
          {priorRoundFile && (
            <span className="ml-3 font-archivo text-[12px] text-[#a0f0a0]">{priorRoundFile.name}</span>
          )}
        </div>
      )}

      {error && (
        <p className="font-archivo text-[13px] text-red-400 mb-4">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={state === "loading" || !algoType}
        className="inline-flex items-center gap-2 bg-gradient-to-r from-[#28D7E6] to-[#11C2C2] text-[#0A2A3D] font-archivo font-bold text-[14px] px-6 py-3.5 rounded-[12px] hover:-translate-y-[1px] transition-transform disabled:opacity-50 disabled:translate-y-0"
      >
        {state === "loading" ? "Calcul en cours…" : "Calculer les cotes →"}
      </button>
    </div>
  );
}
