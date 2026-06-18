"use client";

// Formulaire de création d'une nouvelle compétition.
// C'est un Client Component car il gère l'état du formulaire et la soumission.
// La sécurité est vérifiée côté serveur dans la Route Handler qui reçoit le POST.

import { useState } from "react";
import { useRouter } from "next/navigation";

const DISCIPLINES = ["K1 Descente", "C1 Descente", "K1 Slalom", "C1 Slalom", "K1 Sprint", "C2 Descente"];

export default function NouvelleCompetition() {
  const router = useRouter();

  const [nom,        setNom]        = useState("");
  const [date,       setDate]       = useState("");
  const [discipline, setDiscipline] = useState("");
  const [lieu,       setLieu]       = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/admin/competitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, date, discipline, lieu }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Erreur inconnue");
      return;
    }

    // Redirige vers la page d'édition de la compétition créée
    router.push(`/admin/competitions/${json.id}`);
  }

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <a href="/admin" className="font-archivo text-[13px] text-[#7c9aaa] hover:text-white transition-colors">
          ← Retour
        </a>
        <h1 className="font-anton italic uppercase text-white text-[36px] leading-[0.9] mt-4">
          Nouvelle<br /><span className="text-cyan">compétition</span>
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Nom */}
        <div className="flex flex-col gap-2">
          <label className="font-grotesk font-bold text-[10px] tracking-[.12em] uppercase text-[#7c9aaa]">
            Nom de la compétition *
          </label>
          <input
            type="text"
            required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex : Championnats de France de Descente"
            className="bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-[12px] px-4 py-3.5 text-white font-archivo text-[14px] placeholder:text-[#4a6a7a] outline-none focus:border-[rgba(40,215,230,.5)] focus:bg-[rgba(40,215,230,.04)] transition-colors"
          />
        </div>

        {/* Discipline */}
        <div className="flex flex-col gap-2">
          <label className="font-grotesk font-bold text-[10px] tracking-[.12em] uppercase text-[#7c9aaa]">
            Discipline
          </label>
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value)}
            className="bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-[12px] px-4 py-3.5 text-white font-archivo text-[14px] outline-none focus:border-[rgba(40,215,230,.5)] transition-colors appearance-none"
          >
            <option value="" className="bg-[#0a2a3d]">— Choisir —</option>
            {DISCIPLINES.map((d) => (
              <option key={d} value={d} className="bg-[#0a2a3d]">{d}</option>
            ))}
          </select>
        </div>

        {/* Date + Lieu côte à côte */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="font-grotesk font-bold text-[10px] tracking-[.12em] uppercase text-[#7c9aaa]">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-[12px] px-4 py-3.5 text-white font-archivo text-[14px] outline-none focus:border-[rgba(40,215,230,.5)] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-grotesk font-bold text-[10px] tracking-[.12em] uppercase text-[#7c9aaa]">
              Lieu
            </label>
            <input
              type="text"
              value={lieu}
              onChange={(e) => setLieu(e.target.value)}
              placeholder="Ex : La Plagne"
              className="bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-[12px] px-4 py-3.5 text-white font-archivo text-[14px] placeholder:text-[#4a6a7a] outline-none focus:border-[rgba(40,215,230,.5)] transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="bg-[rgba(255,122,69,.1)] border border-[rgba(255,122,69,.3)] rounded-xl px-4 py-3 font-archivo text-[13px] text-[#FF7A45]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 bg-gradient-to-r from-[#28D7E6] to-[#11C2C2] text-[#0A2A3D] font-archivo font-bold text-[14px] px-6 py-4 rounded-[12px] hover:-translate-y-[1px] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Création…" : "Créer la compétition →"}
        </button>
      </form>
    </div>
  );
}
