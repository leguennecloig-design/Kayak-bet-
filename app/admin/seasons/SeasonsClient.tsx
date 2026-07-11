"use client";

import { useState } from "react";

type Season = {
  id: string;
  label: string;
  is_current: boolean;
  started_at: string;
  created_at: string;
};

export default function SeasonsClient({ initialSeasons }: { initialSeasons: Season[] }) {
  const [seasons, setSeasons] = useState<Season[]>(initialSeasons);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const current = seasons.find((s) => s.is_current);

  async function createSeason() {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (
      !confirm(
        `Créer "${trimmed}" comme nouvelle saison courante ? Cette action remet IMMÉDIATEMENT le solde de TOUS les comptes à 3000 crédits et redémarre le classement général à zéro. Irréversible.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erreur"); return; }
      setSeasons((prev) => [json.season, ...prev.map((s) => ({ ...s, is_current: false }))]);
      setLabel("");
    } catch {
      setError("Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-anton italic uppercase text-white text-[36px] leading-[0.9]">
          Saisons du <span className="text-cyan">classement</span>
        </h1>
        <p className="text-[#7c9aaa] font-archivo text-[13px] mt-3 leading-relaxed">
          Le classement général se base sur le solde actuel des comptes. Créer une nouvelle
          saison remet tous les soldes à 3000 crédits et redémarre le classement à zéro.
        </p>
      </div>

      {current && (
        <div className="bg-[rgba(40,215,230,.06)] border border-[rgba(40,215,230,.25)] rounded-2xl px-5 py-4 mb-6">
          <p className="font-grotesk font-bold text-[10px] tracking-[.14em] uppercase text-cyan mb-1">
            Saison courante
          </p>
          <p className="font-archivo font-extrabold text-[18px] text-white">{current.label}</p>
          <p className="font-archivo text-[12px] text-[#7c9aaa] mt-1">
            Depuis le {new Date(current.started_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
          </p>
        </div>
      )}

      <div className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[18px] p-6 mb-8">
        <h2 className="font-grotesk font-bold text-[10px] tracking-[.18em] uppercase text-[#7c9aaa] mb-4">
          Démarrer une nouvelle saison
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex : Saison 2027"
            className="flex-1 bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-[11px] px-4 py-3 text-white font-archivo text-[13.5px] placeholder:text-[#4a6a7a] outline-none focus:border-[rgba(40,215,230,.5)]"
          />
          <button
            onClick={createSeason}
            disabled={busy || !label.trim()}
            className="bg-gradient-to-r from-[#28D7E6] to-[#11C2C2] text-[#0A2A3D] font-archivo font-bold text-[13px] px-5 py-3 rounded-[11px] hover:-translate-y-[1px] transition-transform disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {busy ? "…" : "Créer la saison"}
          </button>
        </div>
        {error && <p className="font-archivo text-[12.5px] text-[#FF7A45] mt-3">{error}</p>}
      </div>

      <div className="border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-[rgba(7,31,45,.6)] border-b border-[var(--border)]">
          <p className="font-grotesk font-bold text-[11px] uppercase tracking-[.1em] text-[#7c9aaa]">
            Historique des saisons
          </p>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {seasons.length === 0 ? (
            <p className="font-archivo text-[13px] text-[#5c7c8c] px-4 py-4">Aucune saison pour l&apos;instant.</p>
          ) : seasons.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-archivo font-bold text-[13.5px] text-white">{s.label}</p>
                <p className="font-archivo text-[11.5px] text-[#7c9aaa] mt-0.5">
                  {new Date(s.started_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                </p>
              </div>
              {s.is_current && (
                <span className="font-grotesk font-bold text-[9.5px] tracking-[.1em] uppercase border rounded-[5px] px-[7px] py-[3px] text-[#28D7E6] bg-[rgba(40,215,230,.12)] border-[rgba(40,215,230,.3)]">
                  Courante
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
