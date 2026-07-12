"use client";

import { useState } from "react";

export type IgRequest = {
  userId: string;
  username: string | null;
  email: string | null;
  handle: string | null;
  requestedAt: string | null;
};

export default function InstagramClient({
  initialRequests,
  unavailable,
}: {
  initialRequests: IgRequest[];
  unavailable: boolean;
}) {
  const [requests, setRequests] = useState<IgRequest[]>(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function act(userId: string, action: "approve" | "reject") {
    setBusyId(userId);
    setError("");
    try {
      const res = await fetch("/api/admin/instagram-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erreur"); return; }
      setRequests((prev) => prev.filter((r) => r.userId !== userId));
    } catch {
      setError("Erreur réseau");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-anton italic uppercase text-white text-[36px] leading-[0.9]">
          Bonus <span className="text-cyan">Instagram</span>
        </h1>
        <p className="text-[#7c9aaa] font-archivo text-[13px] mt-3 leading-relaxed">
          Vérifie que chaque joueur est bien dans tes abonnés Instagram, puis approuve
          (crédite 500 crédits) ou refuse. Les demandes disparaissent une fois traitées.
        </p>
      </div>

      {unavailable && (
        <div className="bg-[rgba(255,122,69,.08)] border border-[rgba(255,122,69,.35)] rounded-2xl px-5 py-4 mb-6">
          <p className="font-archivo text-[13px] text-[#FF7A45]">
            Fonctionnalité indisponible : la migration <code>20260720_instagram_reward_validation.sql</code> n&apos;a
            pas encore été appliquée dans Supabase (SQL Editor).
          </p>
        </div>
      )}

      {error && <p className="font-archivo text-[12.5px] text-[#FF7A45] mb-4">{error}</p>}

      <div className="border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-[rgba(7,31,45,.6)] border-b border-[var(--border)]">
          <p className="font-grotesk font-bold text-[11px] uppercase tracking-[.1em] text-[#7c9aaa]">
            En attente de validation ({requests.length})
          </p>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {requests.length === 0 ? (
            <p className="font-archivo text-[13px] text-[#5c7c8c] px-4 py-5">Aucune demande en attente.</p>
          ) : requests.map((r) => (
            <div key={r.userId} className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div className="min-w-0">
                <a
                  href={`https://www.instagram.com/${r.handle}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-archivo font-extrabold text-[14px] text-cyan hover:underline"
                >
                  @{r.handle}
                </a>
                <p className="font-archivo text-[12px] text-[#9fbac6] mt-0.5 truncate">
                  {r.username ?? "—"} · {r.email ?? "—"}
                </p>
                {r.requestedAt && (
                  <p className="font-archivo text-[11px] text-[#5c7c8c] mt-0.5">
                    Demandé le {new Date(r.requestedAt).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-none">
                <button
                  onClick={() => act(r.userId, "reject")}
                  disabled={busyId === r.userId}
                  className="font-archivo font-bold text-[12px] text-[#FF7A45] border border-[rgba(255,122,69,.4)] px-3 py-2 rounded-lg hover:bg-[rgba(255,122,69,.08)] transition-colors disabled:opacity-50"
                >
                  Refuser
                </button>
                <button
                  onClick={() => act(r.userId, "approve")}
                  disabled={busyId === r.userId}
                  className="font-archivo font-bold text-[12px] text-[#0A2A3D] bg-gradient-to-r from-[#28D7E6] to-[#11C2C2] px-3.5 py-2 rounded-lg hover:-translate-y-[1px] transition-transform disabled:opacity-50 whitespace-nowrap"
                >
                  {busyId === r.userId ? "…" : "Approuver +500"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
