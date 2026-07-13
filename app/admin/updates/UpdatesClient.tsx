"use client";

import { useEffect, useState } from "react";

type Announcement = {
  id: string;
  version: string;
  title: string;
  changelog: string[];
  cta_label: string | null;
  cta_url: string | null;
  active: boolean;
  created_at: string;
};

export default function UpdatesClient() {
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("Nouvelle version disponible");
  const [changelog, setChangelog] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Voir les nouveautés");
  const [ctaUrl, setCtaUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  const [history, setHistory] = useState<Announcement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/admin/app-announcements");
      const json = await res.json();
      setHistory(json.announcements ?? []);
    } catch {
      /* silencieux */
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => { loadHistory(); }, []);

  async function publish() {
    const lines = changelog.split("\n").map(l => l.trim()).filter(Boolean);
    if (!version.trim() || lines.length === 0) return;
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/admin/app-announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: version.trim(),
          title: title.trim(),
          changelog: lines,
          ctaLabel: ctaLabel.trim() || undefined,
          ctaUrl: ctaUrl.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      setState("ok");
      setMsg("✓ Annonce publiée — les joueurs la verront à leur prochaine ouverture de l'app.");
      setVersion("");
      setChangelog("");
      loadHistory();
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error ? e.message : "Erreur inconnue");
    }
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/admin/app-announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    loadHistory();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette annonce ?")) return;
    await fetch(`/api/admin/app-announcements/${id}`, { method: "DELETE" });
    loadHistory();
  }

  const inputCls = "bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-[11px] px-4 py-3 text-white font-archivo text-[13.5px] placeholder:text-[#4a6a7a] outline-none focus:border-[rgba(40,215,230,.5)] focus:bg-[rgba(40,215,230,.04)] transition-colors w-full";
  const labelCls = "font-grotesk font-bold text-[9.5px] tracking-[.14em] uppercase text-[#7c9aaa] mb-1.5 block";

  return (
    <div className="max-w-xl">
      <h1 className="font-anton italic uppercase text-white text-[36px] leading-[0.9]">
        Pop-up de<br /><span className="text-cyan">mise à jour</span>
      </h1>
      <p className="font-archivo text-[13px] text-[#7c9aaa] mt-3 mb-8 leading-relaxed">
        Annonce affichée aux joueurs à l&apos;ouverture de l&apos;app (une fois par version).
        Publier une nouvelle annonce désactive automatiquement la précédente.
      </p>

      <div className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[18px] p-6 flex flex-col gap-4 mb-8">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Version</label>
            <input className={inputCls} value={version} onChange={(e) => setVersion(e.target.value)} placeholder="Ex : 1.3.0" maxLength={30} />
          </div>
          <div>
            <label className={labelCls}>Titre</label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Quoi de neuf <span className="normal-case text-[#5c7c8c]">(une nouveauté par ligne)</span></label>
          <textarea
            className={inputCls}
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            placeholder={"Nouveau classement par winrate\nRecherche d'amis\nCorrections de bugs"}
            rows={5}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Texte du bouton <span className="normal-case text-[#5c7c8c]">(optionnel)</span></label>
            <input className={inputCls} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={40} />
          </div>
          <div>
            <label className={labelCls}>Lien du bouton <span className="normal-case text-[#5c7c8c]">(optionnel)</span></label>
            <input className={inputCls} value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="/app" />
          </div>
        </div>

        <button
          onClick={publish}
          disabled={state === "loading" || !version.trim() || !changelog.trim()}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#28D7E6] to-[#11C2C2] text-[#0A2A3D] font-archivo font-bold text-[13px] px-5 py-3 rounded-[10px] hover:-translate-y-[1px] transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
        >
          {state === "loading" ? "Publication…" : "Publier l'annonce"}
        </button>

        {msg && (
          <p className={`font-archivo text-[12.5px] ${state === "error" ? "text-red-400" : "text-[#a0f0a0]"}`}>
            {msg}
          </p>
        )}
      </div>

      <h2 className="font-grotesk font-bold text-[10px] tracking-[.18em] uppercase text-[#7c9aaa] mb-3">
        Historique
      </h2>
      {historyLoading ? (
        <p className="font-archivo text-[13px] text-[#5c7c8c]">Chargement…</p>
      ) : history.length === 0 ? (
        <p className="font-archivo text-[13px] text-[#5c7c8c]">Aucune annonce pour l&apos;instant.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {history.map((a) => (
            <div key={a.id} className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[14px] p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-archivo font-extrabold text-[13.5px] text-white">{a.title}</span>
                  <span className="font-grotesk font-bold text-[10px] text-[#7c9aaa]">v{a.version}</span>
                  {a.active && (
                    <span className="font-grotesk font-bold text-[9px] tracking-[.08em] uppercase text-[#28D7E6] bg-[rgba(40,215,230,.12)] border border-[rgba(40,215,230,.3)] rounded-full px-2 py-0.5">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <button
                    onClick={() => toggleActive(a.id, !a.active)}
                    className="font-archivo font-bold text-[11.5px] text-[#9fbac6] hover:text-white transition-colors"
                  >
                    {a.active ? "Dépublier" : "Republier"}
                  </button>
                  <button
                    onClick={() => remove(a.id)}
                    className="font-archivo font-bold text-[11.5px] text-[#FF7A45] hover:text-[#ff9a70] transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
              <ul className="list-disc list-inside space-y-0.5">
                {a.changelog.map((line, i) => (
                  <li key={i} className="font-archivo text-[12.5px] text-[#9fbac6]">{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
