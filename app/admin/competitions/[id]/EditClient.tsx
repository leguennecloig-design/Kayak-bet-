"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import ResultatsSection from "./ResultatsSection";

type Competition = {
  id: string;
  nom: string;
  date: string | null;
  discipline: string | null;
  lieu: string | null;
  status: string;
  ffck_inscription_code: number | null;
  ffck_match_status: string;
  type_competition: string | null;
  type_epreuve: string | null;
};

type InscriptionRow = {
  id: string;
  code_bateau: string;
  nom: string;
  sexe: string | null;
  club: string | null;
  licence_valide: boolean | null;
  athlete_id: string | null;
};

type Participant = {
  id: string;
  nom: string;
  pays: string | null;
  cote: number | null;
  categorie: string | null;
};

type AthleteResult = {
  rang: number;
  nom_prenom: string;
  club: string;
  code_bateau: string;
  points: number;
  nb_courses: number;
  categorie: string;
};

const DISCIPLINES = ["K1 Descente", "C1 Descente", "K1 Slalom", "C1 Slalom", "K1 Sprint", "C2 Descente"];

const ATHLETE_CATEGORIES = [
  "C1D", "C1DU15", "C1DU18", "C1HM1", "C1HM2", "C1HM22", "C1HM3",
  "C1HU15", "C1HU18", "C1HU21", "C2D", "C2DU15", "C2H", "C2HM",
  "C2HU15", "C2HU18", "C2M", "C2MU15", "K1DM", "K1DM22", "K1DU15",
  "K1DU18", "K1DU21", "K1HM1", "K1HM2", "K1HM22", "K1HM3", "K1HU15",
  "K1HU18", "K1HU21",
];

const STATUS_STYLE: Record<string, string> = {
  draft:     "bg-[rgba(255,122,69,.15)] text-[#FF7A45] border-[rgba(255,122,69,.3)]",
  published: "bg-[rgba(40,215,230,.12)] text-[#28D7E6] border-[rgba(40,215,230,.3)]",
  closed:    "bg-[rgba(255,255,255,.06)] text-[#7c9aaa] border-[rgba(255,255,255,.1)]",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon", published: "Active", closed: "Terminé",
};

const RACE_TYPES_WITH_FILE = new Set(["mass_start", "sprint_finale"]);

export default function EditClient({
  competition,
  initialParticipants,
  inscriptions,
}: {
  competition: Competition;
  initialParticipants: Participant[];
  inscriptions: InscriptionRow[];
}) {
  const router = useRouter();

  // Infos compétition
  const [nom,        setNom]        = useState(competition.nom);
  const [date,       setDate]       = useState(competition.date ?? "");
  const [discipline, setDiscipline] = useState(competition.discipline ?? "");
  const [typeCompetition, setTypeCompetition] = useState(competition.type_competition ?? "");
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

  // Athlete search
  const [showAthleteSearch, setShowAthleteSearch] = useState(false);
  const [athleteQ,          setAthleteQ]          = useState("");
  const [athleteCat,        setAthleteCat]        = useState("");
  const [athleteResults,    setAthleteResults]    = useState<AthleteResult[]>([]);
  const [athleteSearching,  setAthleteSearching]  = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const compId = competition.id;

  /* ---- Recherche athlètes (debounced 300ms) ---- */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!athleteQ.trim() && !athleteCat) {
      setAthleteResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setAthleteSearching(true);
      const params = new URLSearchParams();
      if (athleteQ.trim()) params.set("q", athleteQ.trim());
      if (athleteCat)       params.set("cat", athleteCat);
      const res = await fetch(`/api/admin/athletes/search?${params}`);
      const data: AthleteResult[] = await res.json();
      setAthleteResults(data);
      setAthleteSearching(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [athleteQ, athleteCat]);

  /* ---- Sauvegarder les infos de la compétition ---- */
  async function saveComp() {
    setSaving(true);
    setSaveMsg("");
    const res = await fetch(`/api/admin/competitions/${compId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, date, discipline, lieu, type_competition: typeCompetition || null }),
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
    if (res.ok) setStatus(newStatus);
  }

  /* ---- Supprimer la compétition ---- */
  async function deleteComp() {
    if (!confirm("Supprimer définitivement cette compétition et tous ses participants ?")) return;
    const res = await fetch(`/api/admin/competitions/${compId}`, { method: "DELETE" });
    if (res.ok) router.push("/admin");
  }

  /* ---- Ajouter un participant (formulaire manuel) ---- */
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

  /* ---- Importer un athlète depuis la base FFCK ---- */
  async function addAthlete(a: AthleteResult) {
    setPLoading(true);
    const res = await fetch(`/api/admin/competitions/${compId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: a.nom_prenom, pays: a.club, cote: null }),
    });
    const json = await res.json();
    setPLoading(false);
    if (!res.ok) { setPError(json.error ?? "Erreur"); return; }
    setParticipants((prev) => [...prev, json].sort((x, y) => (x.cote ?? 99) - (y.cote ?? 99)));
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

  const [showPartants, setShowPartants] = useState(inscriptions.length > 0 && inscriptions.length <= 30);

  // Calcul des cotes
  const [cotesState, setCotesState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [cotesMsg,   setCotesMsg]   = useState<string>("");
  const [priorRoundFile, setPriorRoundFile] = useState<File | null>(null);

  // Clôture
  const [closeState, setCloseState] = useState<"idle" | "loading" | "ok" | "error">(
    status === "closed" ? "ok" : "idle"
  );
  const [closeMsg,   setCloseMsg]   = useState<string>("");

  async function closeCompetition() {
    if (!confirm("Clôturer la compétition et régler tous les paris en attente ? Cette action est irréversible.")) return;
    setCloseState("loading");
    setCloseMsg("");
    try {
      const res  = await fetch(`/api/admin/competitions/${compId}/close`, { method: "POST" });
      const text = await res.text();
      let json: Record<string, unknown> = {};
      try { json = JSON.parse(text); } catch { throw new Error(`Réponse invalide (${res.status})`); }
      if (!res.ok) throw new Error((json.error as string) ?? "Erreur serveur");
      const failed = json.failedSettlements as { betId: string }[] | undefined;
      const failedMsg = failed && failed.length > 0
        ? ` · ⚠ ${failed.length} pari(s) gagnant(s) non réglé(s) (échec du crédit) — à traiter manuellement`
        : "";
      setCloseMsg(`${json.betsSettled} paris réglés · ${json.won} gagnants · ${json.lost} perdants · ${Math.round(Number(json.totalPaid)).toLocaleString("fr-FR")} cr. versés${failedMsg}`);
      setCloseState(failed && failed.length > 0 ? "error" : "ok");
      setStatus("closed");
    } catch (e) {
      setCloseMsg(e instanceof Error ? e.message : "Erreur inconnue");
      setCloseState("error");
    }
  }

  async function calculateCotes() {
    const needsFile = RACE_TYPES_WITH_FILE.has(typeCompetition);
    if (needsFile && !priorRoundFile) {
      setCotesState("error");
      setCotesMsg(
        typeCompetition === "mass_start"
          ? "Joins les résultats de la classique pour calculer les cotes mass start."
          : "Joins les résultats du sprint normal pour calculer les cotes sprint finale."
      );
      return;
    }
    setCotesState("loading");
    setCotesMsg("");
    try {
      const fd = new FormData();
      fd.append("race_type", typeCompetition || "standard");
      if (needsFile && priorRoundFile) fd.append("file", priorRoundFile);
      const res  = await fetch(`/api/admin/competitions/${compId}/calculate-cotes`, { method: "POST", body: fd });
      const text = await res.text();
      let json: Record<string, unknown> = {};
      try { json = JSON.parse(text); } catch { throw new Error(`Réponse invalide du serveur (${res.status})`); }
      if (!res.ok) throw new Error((json.error as string) ?? "Erreur serveur");
      const cats = Object.entries(json.categories as Record<string, number>)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      setCotesMsg(`${json.total_cotes} cotes générées · ${json.participants_created} participants · ${cats}`);
      setCotesState("ok");
      // Rechargement complet pour afficher les participants dans la liste
      setTimeout(() => window.location.reload(), 1800);
    } catch (e) {
      setCotesMsg(e instanceof Error ? e.message : "Erreur inconnue");
      setCotesState("error");
    }
  }

  const inputCls = "bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-[11px] px-4 py-3 text-white font-archivo text-[13.5px] placeholder:text-[#4a6a7a] outline-none focus:border-[rgba(40,215,230,.5)] focus:bg-[rgba(40,215,230,.04)] transition-colors";
  const labelCls = "font-grotesk font-bold text-[9.5px] tracking-[.14em] uppercase text-[#7c9aaa] mb-1.5";
  const isDescente = competition.discipline?.toLowerCase().includes("descente") ?? false;

  return (
    <div className="max-w-3xl">

      {/* Fil d'ariane */}
      <a href="/admin" className="font-archivo text-[13px] text-[#7c9aaa] hover:text-white transition-colors">
        ← Toutes les compétitions
      </a>

      {/* Workflow steps */}
      <div className="flex items-center gap-1.5 mt-5 font-grotesk font-bold text-[9px] tracking-[.12em] uppercase">
        {(["Informations", "Participants", "Résultats", "Clôture"] as const).map((s, i) => (
          <Fragment key={s}>
            {i > 0 && <span className="text-[#2a4a5a] text-[8px]">›</span>}
            <span className={`px-2.5 py-1 rounded-md border ${
              status === "closed" && i === 3
                ? "text-[#a0f0a0] bg-[rgba(160,240,160,.07)] border-[rgba(160,240,160,.25)]"
                : i <= (participants.length > 0 ? 1 : 0)
                  ? "text-[#28D7E6] bg-[rgba(40,215,230,.06)] border-[rgba(40,215,230,.2)]"
                  : "text-[#5c7c8c] border-[#2a4a5a]"
            }`}>
              {i + 1}. {s}
            </span>
          </Fragment>
        ))}
      </div>

      {/* En-tête : nom + badge statut + bouton publier */}
      <div className="flex items-start justify-between gap-6 mt-5 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`font-grotesk font-bold text-[9.5px] tracking-[.1em] uppercase border rounded-[5px] px-[7px] py-[3px] ${STATUS_STYLE[status] ?? STATUS_STYLE.draft}`}>
              {STATUS_LABEL[status] ?? status}
            </span>
            {competition.type_epreuve && (
              <span className="font-grotesk font-bold text-[9.5px] tracking-[.1em] uppercase border rounded-[5px] px-[7px] py-[3px] text-[#b39ddb] bg-[rgba(179,157,219,.12)] border-[rgba(179,157,219,.3)]">
                {competition.type_epreuve}
              </span>
            )}
          </div>
          <h1 className="font-anton italic uppercase text-white text-[32px] leading-[0.9]">
            {competition.nom}
          </h1>
        </div>

        <div className="flex items-center gap-3 flex-none">
          {status !== "published" ? (
            <button
              onClick={togglePublish}
              disabled={participants.length === 0 || participants.some(p => !p.cote || p.cote <= 0)}
              title={
                participants.length === 0
                  ? "Ajoute au moins un participant avant de publier"
                  : participants.some(p => !p.cote || p.cote <= 0)
                    ? "Certains participants n'ont pas de cote — recalcule les cotes ou complète-les manuellement"
                    : ""
              }
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
            <label className={labelCls}>Type</label>
            <select value={typeCompetition} onChange={(e) => setTypeCompetition(e.target.value)}
              className={`${inputCls} appearance-none`}>
              <option value="" className="bg-[#0a2a3d]">— Choisir —</option>
              <option value="sprint" className="bg-[#0a2a3d]">Sprint normal</option>
              <option value="classique" className="bg-[#0a2a3d]">Classique</option>
              <option value="mass_start" className="bg-[#0a2a3d]">Mass start</option>
              <option value="sprint_finale" className="bg-[#0a2a3d]">Sprint finale</option>
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
          <div className="flex flex-col gap-1 mb-6">
            {participants.map((p, i) => {
              const groupKey = p.categorie ?? p.pays ?? "";
              const prevGroupKey = i > 0 ? (participants[i - 1].categorie ?? participants[i - 1].pays ?? "") : null;
              const showHeader = groupKey && groupKey !== prevGroupKey;
              return (
              <Fragment key={p.id}>
                {showHeader && (
                  <div className="font-grotesk font-bold text-[9.5px] uppercase tracking-[.16em] text-[#7c9aaa] px-1 pt-4 pb-1 first:pt-0">
                    {groupKey}
                  </div>
                )}
              <div className="flex items-center gap-3 bg-[rgba(255,255,255,.04)] border border-[var(--border)] rounded-[12px] px-4 py-3">
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

                {/* Nom + club/pays */}
                <div className="flex-1 min-w-0">
                  <div className="font-archivo font-extrabold text-[14px] text-white truncate">{p.nom}</div>
                  {p.pays && (
                    <div className="font-grotesk font-bold text-[9px] tracking-[.1em] text-[#7c9aaa] mt-0.5 uppercase truncate">{p.pays}</div>
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
              </Fragment>
              );
            })}
          </div>
        ) : (
          <p className="font-archivo text-[13.5px] text-[#5c7c8c] mb-5">
            Aucun participant pour l'instant.
          </p>
        )}

        {/* Formulaire ajout manuel */}
        <form onSubmit={addParticipant} className="border-t border-[var(--border)] pt-5">
          <p className="font-grotesk font-bold text-[9.5px] tracking-[.14em] uppercase text-[#7c9aaa] mb-3">
            Ajouter manuellement
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
              <label className={labelCls}>Club / Pays</label>
              <input
                type="text"
                value={pPays}
                onChange={(e) => setPPays(e.target.value)}
                placeholder="Club ou FR"
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

        {/* ---- Recherche dans la base FFCK ---- */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => { setShowAthleteSearch((v) => !v); setAthleteQ(""); setAthleteCat(""); setAthleteResults([]); }}
            className="flex items-center gap-2 font-archivo font-semibold text-[12.5px] text-[#7c9aaa] hover:text-[#28D7E6] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
              <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {showAthleteSearch ? "Masquer la base FFCK" : "Importer depuis la base FFCK 2026"}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className={`w-3.5 h-3.5 transition-transform ${showAthleteSearch ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {showAthleteSearch && (
            <div className="mt-4 bg-[rgba(40,215,230,.04)] border border-[rgba(40,215,230,.2)] rounded-[14px] p-4">
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                {/* Recherche nom */}
                <div className="relative flex-1">
                  <svg viewBox="0 0 24 24" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6a7a] pointer-events-none">
                    <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Nom de l'athlète…"
                    value={athleteQ}
                    onChange={(e) => setAthleteQ(e.target.value)}
                    className={`${inputCls} pl-9`}
                    autoFocus
                  />
                </div>
                {/* Filtre catégorie */}
                <div className="relative sm:w-52">
                  <select
                    value={athleteCat}
                    onChange={(e) => setAthleteCat(e.target.value)}
                    className={`${inputCls} w-full appearance-none pr-8`}
                  >
                    <option value="" className="bg-[#0a2a3d]">Toutes catégories</option>
                    {ATHLETE_CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-[#0a2a3d]">{c}</option>
                    ))}
                  </select>
                  <svg viewBox="0 0 24 24" fill="none" className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6a7a] pointer-events-none">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Résultats */}
              {athleteSearching && (
                <p className="font-archivo text-[12.5px] text-[#7c9aaa] text-center py-4">Recherche…</p>
              )}
              {!athleteSearching && (athleteQ.trim() || athleteCat) && athleteResults.length === 0 && (
                <p className="font-archivo text-[12.5px] text-[#5c7c8c] text-center py-4">Aucun athlète trouvé.</p>
              )}
              {!athleteSearching && !athleteQ.trim() && !athleteCat && (
                <p className="font-archivo text-[12.5px] text-[#5c7c8c] text-center py-3">
                  Saisissez un nom ou sélectionnez une catégorie.
                </p>
              )}

              {athleteResults.length > 0 && (
                <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                  {athleteResults.map((a) => (
                    <button
                      key={`${a.code_bateau}-${a.categorie}`}
                      type="button"
                      onClick={() => addAthlete(a)}
                      disabled={pLoading}
                      className="flex items-center gap-3 text-left w-full bg-[rgba(255,255,255,.04)] hover:bg-[rgba(40,215,230,.1)] border border-[var(--border)] hover:border-[rgba(40,215,230,.4)] rounded-[10px] px-4 py-3 transition-colors group disabled:opacity-40"
                    >
                      <span className="font-anton italic text-[16px] text-[#28D7E6] w-8 text-center flex-none">
                        {a.rang}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-archivo font-extrabold text-[13px] text-white truncate">
                          {a.nom_prenom}
                        </div>
                        <div className="font-grotesk font-bold text-[9px] tracking-[.06em] text-[#7c9aaa] mt-0.5 truncate">
                          {a.club}
                        </div>
                      </div>
                      <span className="font-grotesk font-bold text-[9px] tracking-[.1em] uppercase text-[#28D7E6] bg-[rgba(40,215,230,.12)] border border-[rgba(40,215,230,.25)] rounded-[5px] px-[6px] py-[3px] flex-none">
                        {a.categorie}
                      </span>
                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[#5c7c8c] group-hover:text-[#28D7E6] transition-colors flex-none">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---- Section Résultats ---- */}
      <ResultatsSection competitionId={compId} competitionNom={nom} />

      {/* ---- Clôture & règlement des paris ---- */}
      <div className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[18px] p-6 mt-6">
        <h2 className="font-grotesk font-bold text-[10px] tracking-[.18em] uppercase text-[#7c9aaa] mb-3">
          Clôture de la compétition
        </h2>
        <p className="font-archivo text-[12.5px] text-[#5c7c8c] mb-4">
          Importe les résultats (section ci-dessus), puis clôture la compétition.<br />
          Tous les paris en attente seront réglés automatiquement : les gagnants recevront leurs gains.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          {status !== "closed" ? (
            <button
              onClick={closeCompetition}
              disabled={closeState === "loading"}
              className={`inline-flex items-center gap-2 font-archivo font-bold text-[13px] px-5 py-2.5 rounded-[10px] border transition-colors disabled:opacity-50 ${
                closeState === "error"
                  ? "text-red-400 border-red-500/30 bg-red-500/10"
                  : "text-[#FF7A45] border-[rgba(255,122,69,.4)] hover:bg-[rgba(255,122,69,.1)]"
              }`}
            >
              {closeState === "loading" ? (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {closeState === "loading" ? "Règlement en cours…" : "Clôturer et régler les paris"}
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 font-archivo font-bold text-[13px] px-5 py-2.5 rounded-[10px] border text-[#a0f0a0] border-[rgba(160,240,160,.3)] bg-[rgba(160,240,160,.07)]">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path d="M5 12.5 10 17.5 19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Compétition clôturée
            </span>
          )}
          {closeMsg && (
            <span className={`font-archivo text-[12px] ${closeState === "error" ? "text-red-400" : "text-[#a0f0a0]"}`}>
              {closeMsg}
            </span>
          )}
        </div>
      </div>

      {/* ---- Section Partants FFCK (Descente uniquement) ---- */}
      {isDescente && (
        <div className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[18px] p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-grotesk font-bold text-[10px] tracking-[.18em] uppercase text-[#7c9aaa]">
                Partants FFCK
              </h2>
              {competition.ffck_inscription_code ? (
                <p className="font-archivo text-[12px] text-[#5c7c8c] mt-0.5">
                  Code FFCK #{competition.ffck_inscription_code}
                  {" · "}
                  <a
                    href={`/admin/inscriptions`}
                    className="text-[#28D7E6] hover:underline"
                  >
                    Gérer les inscriptions →
                  </a>
                </p>
              ) : (
                <p className="font-archivo text-[12px] text-[#5c7c8c] mt-0.5">
                  Pas encore matché FFCK —{" "}
                  <a href="/admin/inscriptions" className="text-[#28D7E6] hover:underline">
                    Lancer le scan →
                  </a>
                </p>
              )}
            </div>
            {inscriptions.length > 0 && (
              <button
                onClick={() => setShowPartants(v => !v)}
                className="font-archivo font-semibold text-[12px] text-[#7c9aaa] border border-[var(--border-2)] px-3 py-1.5 rounded-[9px] hover:text-white hover:border-[rgba(40,215,230,.3)] transition-colors"
              >
                {showPartants ? "Masquer" : `Voir ${inscriptions.length} partants`}
              </button>
            )}
          </div>

          {/* Fichier de résultats de la manche précédente (mass start / sprint finale) */}
          {inscriptions.length > 0 && RACE_TYPES_WITH_FILE.has(typeCompetition) && (
            <div className="mb-4 bg-[rgba(40,215,230,.04)] border border-[rgba(40,215,230,.2)] rounded-[12px] p-4">
              <p className="font-grotesk font-bold text-[9.5px] tracking-[.14em] uppercase text-[#28D7E6] mb-2">
                {typeCompetition === "mass_start" ? "Résultats de la classique" : "Résultats du sprint normal"}
              </p>
              <p className="font-archivo text-[12px] text-[#7c9aaa] mb-3">
                Fichier PDF ou TXT (même format que l&apos;import de résultats) — requis pour calculer les
                cotes {typeCompetition === "mass_start" ? "mass start" : "sprint finale"}.
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

          {/* Bouton Calculer les cotes */}
          {inscriptions.length > 0 && (
            <div className="mb-5 flex items-center gap-3 flex-wrap">
              <button
                onClick={calculateCotes}
                disabled={cotesState === "loading"}
                className={`inline-flex items-center gap-2 font-archivo font-bold text-[13px] px-5 py-2.5 rounded-[10px] border transition-colors disabled:opacity-50 ${
                  cotesState === "ok"
                    ? "text-[#a0f0a0] border-[rgba(160,240,160,.3)] bg-[rgba(160,240,160,.08)]"
                    : cotesState === "error"
                      ? "text-red-400 border-red-500/30 bg-red-500/10"
                      : "text-[#28D7E6] border-[rgba(40,215,230,.3)] hover:bg-[rgba(40,215,230,.08)]"
                }`}
              >
                {cotesState === "loading" ? (
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {cotesState === "loading" ? "Calcul en cours…" : cotesState === "ok" ? "Cotes recalculées ✓" : "Calculer les cotes (algo)"}
              </button>
              {cotesMsg && (
                <span className={`font-archivo text-[12px] ${cotesState === "error" ? "text-red-400" : "text-[#a0f0a0]"}`}>
                  {cotesMsg}
                </span>
              )}
            </div>
          )}

          {inscriptions.length === 0 ? (
            <p className="font-archivo text-[13px] text-[#5c7c8c]">
              Aucun partant importé.
              {competition.ffck_inscription_code
                ? " Utilise le bouton \"Récupérer les partants\" dans la page Inscriptions."
                : " Commence par matcher cette compétition via la page Inscriptions."}
            </p>
          ) : showPartants ? (
            <div className="overflow-x-auto">
              <table className="w-full font-archivo text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--border-2)]">
                    {["Code bateau", "Nom", "Club", "Lic.", "Lié"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-grotesk font-bold text-[9.5px] tracking-[.1em] uppercase text-[#5c7c8c]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inscriptions.slice(0, 50).map(row => (
                    <tr key={row.id} className="border-b border-[var(--border-2)] hover:bg-white/[.015]">
                      <td className="px-3 py-2 font-mono text-[11px] text-[#7c9aaa]">{row.code_bateau}</td>
                      <td className="px-3 py-2 font-semibold text-white">{row.nom}</td>
                      <td className="px-3 py-2 text-[#7c9aaa] truncate max-w-[200px]">{row.club ?? "—"}</td>
                      <td className="px-3 py-2">
                        {row.licence_valide === true
                          ? <span className="text-[#a0f0a0] font-bold">✓</span>
                          : row.licence_valide === false
                            ? <span className="text-red-400">✗</span>
                            : <span className="text-[#5c7c8c]">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          title={row.athlete_id ? "Athlète dans la base" : "Non lié"}
                          className={`inline-block w-2 h-2 rounded-full ${row.athlete_id ? "bg-[#28D7E6]" : "bg-[#3a5c6c]"}`}
                        />
                      </td>
                    </tr>
                  ))}
                  {inscriptions.length > 50 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-center text-[#5c7c8c] font-archivo text-[11px]">
                        … et {inscriptions.length - 50} autres partants
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
