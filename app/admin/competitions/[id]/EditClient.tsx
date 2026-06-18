"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Competition = {
  id: string;
  nom: string;
  date: string | null;
  discipline: string | null;
  lieu: string | null;
  status: string;
};

type Participant = {
  id: string;
  nom: string;
  pays: string | null;
  cote: number | null;
};

const DISCIPLINES = ["K1 Descente", "C1 Descente", "K1 Slalom", "C1 Slalom", "K1 Sprint", "C2 Descente"];

const STATUS_STYLE: Record<string, string> = {
  draft:     "bg-[rgba(255,122,69,.15)] text-[#FF7A45] border-[rgba(255,122,69,.3)]",
  published: "bg-[rgba(40,215,230,.12)] text-[#28D7E6] border-[rgba(40,215,230,.3)]",
  closed:    "bg-[rgba(255,255,255,.06)] text-[#7c9aaa] border-[rgba(255,255,255,.1)]",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon", published: "Publié", closed: "Terminé",
};

export default function EditClient({
  competition,
  initialParticipants,
}: {
  competition: Competition;
  initialParticipants: Participant[];
}) {
  const router = useRouter();

  // Infos compétition
  const [nom,        setNom]        = useState(competition.nom);
  const [date,       setDate]       = useState(competition.date ?? "");
  const [discipline, setDiscipline] = useState(competition.discipline ?? "");
  const [lieu,       setLieu]       = useState(competition.lieu ?? "");
  const [status,     setStatus]     = useState(competition.status);
  const [saving,     setSaving]     = useState(false);
  const [saveMsg,    setSaveMsg]    = useState("");

  // Participants
  const [participants, setParticipants]   = useState<Participant[]>(initialParticipants);
  const [pNom,         setPNom]           = useState("");
  const [pPays,        setPPays]          = useState("");
  const [pCote,        setPCote]          = useState("");
  const [pLoading,     setPLoading]       = useState(false);
  const [pError,       setPError]         = useState("");

  // Edit participant inline
  const [editId,   setEditId]   = useState<string | null>(null);
  const [editCote, setEditCote] = useState("");

  const compId = competition.id;

  /* ---- Sauvegarder les infos de la compétition ---- */
  async function saveComp() {
    setSaving(true);
    setSaveMsg("");
    const res = await fetch(`/api/admin/competitions/${compId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, date, discipline, lieu }),
    });
    setSaving(false);
    setSaveMsg(res.ok ? "Enregistré ✓" : "Erreur lors de la sauvegarde");
    setTimeout(() => setSaveMsg(""), 2500);
  }

  /* ---- Publier / dépublier ---- */
  async function togglePublish() {
    const newStatus = status === "published" ? "draft" : "published";
    const res = await fetch(`/api/admin/competitions/${compId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setStatus(newStatus);
    }
  }

  /* ---- Supprimer la compétition ---- */
  async function deleteComp() {
    if (!confirm("Supprimer définitivement cette compétition et tous ses participants ?")) return;
    const res = await fetch(`/api/admin/competitions/${compId}`, { method: "DELETE" });
    if (res.ok) router.push("/admin");
  }

  /* ---- Ajouter un participant ---- */
  async function addParticipant(e: React.FormEvent) {
    e.preventDefault();
    setPError("");
    setPLoading(true);

    const res = await fetch(`/api/admin/competitions/${compId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: pNom, pays: pPays, cote: pCote }),
    });

    const json = await res.json();
    setPLoading(false);

    if (!res.ok) { setPError(json.error ?? "Erreur"); return; }

    setParticipants((prev) => [...prev, json].sort((a, b) => (a.cote ?? 99) - (b.cote ?? 99)));
    setPNom(""); setPPays(""); setPCote("");
  }

  /* ---- Supprimer un participant ---- */
  async function deleteParticipant(pid: string) {
    const res = await fetch(`/api/admin/competitions/${compId}/participants/${pid}`, { method: "DELETE" });
    if (res.ok) setParticipants((prev) => prev.filter((p) => p.id !== pid));
  }

  /* ---- Modifier la cote d'un participant ---- */
  async function saveCote(pid: string) {
    const res = await fetch(`/api/admin/competitions/${compId}/participants/${pid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cote: editCote }),
    });
    if (res.ok) {
      setParticipants((prev) =>
        prev.map((p) => p.id === pid ? { ...p, cote: parseFloat(editCote) } : p)
          .sort((a, b) => (a.cote ?? 99) - (b.cote ?? 99))
      );
      setEditId(null);
    }
  }

  const inputCls = "bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-[11px] px-4 py-3 text-white font-archivo text-[13.5px] placeholder:text-[#4a6a7a] outline-none focus:border-[rgba(40,215,230,.5)] focus:bg-[rgba(40,215,230,.04)] transition-colors";
  const labelCls = "font-grotesk font-bold text-[9.5px] tracking-[.14em] uppercase text-[#7c9aaa] mb-1.5";

  return (
    <div className="max-w-3xl">

      {/* Fil d'ariane */}
      <a href="/admin" className="font-archivo text-[13px] text-[#7c9aaa] hover:text-white transition-colors">
        ← Toutes les compétitions
      </a>

      {/* En-tête : nom + badge statut + bouton publier */}
      <div className="flex items-start justify-between gap-6 mt-5 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`font-grotesk font-bold text-[9.5px] tracking-[.1em] uppercase border rounded-[5px] px-[7px] py-[3px] ${STATUS_STYLE[status] ?? STATUS_STYLE.draft}`}>
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>
          <h1 className="font-anton italic uppercase text-white text-[32px] leading-[0.9]">
            {competition.nom}
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-none">
          {status !== "published" ? (
            <button
              onClick={togglePublish}
              disabled={participants.length === 0}
              title={participants.length === 0 ? "Ajoute au moins un participant avant de publier" : ""}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#28D7E6] to-[#11C2C2] text-[#0A2A3D] font-archivo font-bold text-[13px] px-5 py-2.5 rounded-[10px] hover:-translate-y-[1px] transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path d="M5 12.5 10 17.5 19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Publier
            </button>
          ) : (
            <button
              onClick={togglePublish}
              className="inline-flex items-center gap-2 bg-[rgba(255,255,255,.07)] border border-[var(--border-2)] text-[#9fbac6] font-archivo font-bold text-[13px] px-5 py-2.5 rounded-[10px] hover:text-white transition-colors"
            >
              Repasser en brouillon
            </button>
          )}

          <button
            onClick={deleteComp}
            className="w-9 h-9 flex items-center justify-center rounded-[9px] border border-[var(--border-2)] text-[#5c7c8c] hover:border-[rgba(255,122,69,.5)] hover:text-[#FF7A45] transition-colors"
            title="Supprimer cette compétition"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* ---- Infos de la compétition ---- */}
      <div className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[18px] p-6 mb-8">
        <h2 className="font-grotesk font-bold text-[10px] tracking-[.18em] uppercase text-[#7c9aaa] mb-5">
          Informations
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <label className={labelCls}>Nom *</label>
            <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Discipline</label>
            <select value={discipline} onChange={(e) => setDiscipline(e.target.value)}
              className={`${inputCls} appearance-none`}>
              <option value="" className="bg-[#0a2a3d]">— Choisir —</option>
              {DISCIPLINES.map((d) => <option key={d} value={d} className="bg-[#0a2a3d]">{d}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Lieu</label>
            <input type="text" value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Ex : La Plagne" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={saveComp}
            disabled={saving}
            className="bg-gradient-to-r from-[#28D7E6] to-[#11C2C2] text-[#0A2A3D] font-archivo font-bold text-[13px] px-5 py-2.5 rounded-[10px] hover:-translate-y-[1px] transition-transform disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          {saveMsg && (
            <span className={`font-archivo text-[13px] ${saveMsg.startsWith("Erreur") ? "text-[#FF7A45]" : "text-[#28D7E6]"}`}>
              {saveMsg}
            </span>
          )}
        </div>
      </div>

      {/* ---- Participants ---- */}
      <div className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[18px] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-grotesk font-bold text-[10px] tracking-[.18em] uppercase text-[#7c9aaa]">
            Participants
          </h2>
          <span className="font-grotesk font-bold text-[10px] tracking-[.1em] text-[#5c7c8c]">
            {participants.length} au départ
          </span>
        </div>

        {/* Liste */}
        {participants.length > 0 ? (
          <div className="flex flex-col gap-2 mb-6">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-3 bg-[rgba(255,255,255,.04)] border border-[var(--border)] rounded-[12px] px-4 py-3">
                {/* Cote — cliquable pour éditer */}
                {editId === p.id ? (
                  <div className="flex items-center gap-2 flex-none">
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={editCote}
                      onChange={(e) => setEditCote(e.target.value)}
                      autoFocus
                      className="w-20 bg-[rgba(40,215,230,.08)] border border-[rgba(40,215,230,.5)] rounded-[8px] px-2 py-1 text-[#28D7E6] font-anton italic text-[18px] outline-none text-center"
                    />
                    <button onClick={() => saveCote(p.id)} className="text-[#28D7E6] font-archivo font-bold text-[11px] hover:underline">✓</button>
                    <button onClick={() => setEditId(null)} className="text-[#5c7c8c] font-archivo text-[11px] hover:text-white">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditId(p.id); setEditCote(String(p.cote ?? "")); }}
                    className="font-anton italic text-[22px] text-[#28D7E6] leading-none w-16 text-center hover:scale-105 transition-transform flex-none"
                    title="Cliquer pour modifier la cote"
                  >
                    {p.cote != null ? p.cote.toFixed(2) : "—"}
                  </button>
                )}

                {/* Nom + pays */}
                <div className="flex-1 min-w-0">
                  <div className="font-archivo font-extrabold text-[14px] text-white truncate">{p.nom}</div>
                  {p.pays && (
                    <div className="font-grotesk font-bold text-[9px] tracking-[.1em] text-[#7c9aaa] mt-0.5 uppercase">{p.pays}</div>
                  )}
                </div>

                {/* Supprimer */}
                <button
                  onClick={() => deleteParticipant(p.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-[7px] border border-[var(--border-2)] text-[#5c7c8c] hover:border-[rgba(255,122,69,.5)] hover:text-[#FF7A45] transition-colors flex-none"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                    <path d="M6 6 18 18M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-archivo text-[13.5px] text-[#5c7c8c] mb-5">
            Aucun participant pour l'instant.
          </p>
        )}

        {/* Formulaire ajout participant */}
        <form onSubmit={addParticipant} className="border-t border-[var(--border)] pt-5">
          <p className="font-grotesk font-bold text-[9.5px] tracking-[.14em] uppercase text-[#7c9aaa] mb-3">
            Ajouter un participant
          </p>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-5 flex flex-col gap-1.5">
              <label className={labelCls}>Nom *</label>
              <input
                type="text"
                required
                value={pNom}
                onChange={(e) => setPNom(e.target.value)}
                placeholder="Ex : L. Fontaine"
                className={inputCls}
              />
            </div>
            <div className="col-span-3 flex flex-col gap-1.5">
              <label className={labelCls}>Pays</label>
              <input
                type="text"
                value={pPays}
                onChange={(e) => setPPays(e.target.value)}
                placeholder="FR"
                className={inputCls}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className={labelCls}>Cote</label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={pCote}
                onChange={(e) => setPCote(e.target.value)}
                placeholder="1.65"
                className={inputCls}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className={labelCls}>&nbsp;</label>
              <button
                type="submit"
                disabled={pLoading}
                className="h-[46px] bg-[rgba(40,215,230,.12)] border border-[rgba(40,215,230,.35)] text-[#28D7E6] font-archivo font-bold text-[13px] rounded-[11px] hover:bg-[rgba(40,215,230,.2)] transition-colors disabled:opacity-50"
              >
                {pLoading ? "…" : "+ Ajouter"}
              </button>
            </div>
          </div>
          {pError && (
            <p className="mt-3 font-archivo text-[12.5px] text-[#FF7A45]">{pError}</p>
          )}
        </form>
      </div>
    </div>
  );
}
