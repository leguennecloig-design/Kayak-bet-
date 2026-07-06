"use client";

import { useState, useRef, useEffect, Fragment } from "react";
import { useToast } from "@/app/components/Toast";

type Resultat = {
  id:        string;
  categorie: string;
  rang:      number | null;
  dossard:   number | null;
  nom:       string;
  club:      string | null;
  temps:     string | null;
  points:    number | null;
  dns:       boolean;
  dnf:       boolean;
};

type FormEntry = {
  categorie: string;
  nom:       string;
  club:      string;
  dossard:   string;
  rang:      string;
  temps:     string;
  points:    string;
  dns:       boolean;
  dnf:       boolean;
};

type Partant = {
  id:          string;
  code_bateau: string;
  nom:         string;
  club:        string | null;
};

const EMPTY_FORM: FormEntry = {
  categorie: "", nom: "", club: "", dossard: "", rang: "", temps: "", points: "", dns: false, dnf: false,
};

const ATHLETE_CATEGORIES = [
  "C1D","C1DU15","C1DU18","C1HM1","C1HM2","C1HM22","C1HM3",
  "C1HU15","C1HU18","C1HU21","C2D","C2DU15","C2H","C2HM",
  "C2HU15","C2HU18","C2M","C2MU15","K1DM","K1DM22","K1DU15",
  "K1DU18","K1DU21","K1HM1","K1HM2","K1HM22","K1HM3","K1HU15",
  "K1HU18","K1HU21",
];

export default function ResultatsSection({ competitionId, competitionNom }: { competitionId: string; competitionNom: string }) {
  const notify = useToast();
  const [resultats,     setResultats]     = useState<Resultat[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [importState,   setImportState]   = useState<"idle"|"uploading"|"ok"|"error">("idle");
  const [importMsg,     setImportMsg]     = useState("");
  const [showManual,    setShowManual]    = useState(false);
  const [form,          setForm]          = useState<FormEntry>(EMPTY_FORM);
  const [saving,        setSaving]        = useState(false);
  const [saveMsg,       setSaveMsg]       = useState("");
  const [editId,        setEditId]        = useState<string|null>(null);
  const [editFields,    setEditFields]    = useState<Partial<Resultat>>({});
  const [partants,      setPartants]      = useState<Partant[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchResultats() {
    setLoading(true);
    const res = await fetch(`/api/admin/competitions/${competitionId}/resultats`);
    const data = await res.json();
    setResultats(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    fetchResultats();
    fetch(`/api/admin/inscriptions/list/${competitionId}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Partant[]) => setPartants(data))
      .catch(() => {});
  }, [competitionId]);

  // ── Import PDF ──────────────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportState("uploading");
    setImportMsg(`Lecture de ${file.name}…`);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res  = await fetch(`/api/admin/competitions/${competitionId}/import-results`, {
        method: "POST",
        body: fd,
      });
      const text = await res.text();
      let json: Record<string, unknown> = {};
      try { json = JSON.parse(text); } catch { /* ignore */ }

      if (!res.ok) throw new Error((json.error as string) ?? `Erreur ${res.status}`);

      const cats = Object.entries(json.categories as Record<string, number>)
        .map(([k, v]) => `${k}(${v})`)
        .join(", ");
      setImportMsg(`${json.total} résultats importés · ${cats}`);
      setImportState("ok");
      notify({
        course: competitionNom,
        category: `${json.total} résultats`,
        href: `/admin/competitions/${competitionId}`,
      });
      await fetchResultats();
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Erreur inconnue");
      setImportState("error");
    }

    // Reset file input pour permettre re-upload du même fichier
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Effacer tout ────────────────────────────────────────────────────────
  async function clearAll() {
    if (!confirm("Supprimer tous les résultats importés pour cette compétition ?")) return;
    await fetch(`/api/admin/competitions/${competitionId}/resultats`, { method: "DELETE" });
    setResultats([]);
    setImportState("idle");
    setImportMsg("");
  }

  // ── Saisie manuelle : ajouter un résultat ───────────────────────────────
  async function handleAddManual(e: React.FormEvent) {
    e.preventDefault();
    if (!form.categorie.trim() || !form.nom.trim()) return;
    setSaving(true);
    setSaveMsg("");

    const entry = {
      categorie: form.categorie.trim().toUpperCase(),
      nom:       form.nom.trim(),
      rang:      form.dns || form.dnf || !form.rang ? null : parseInt(form.rang, 10),
      dossard:   form.dossard ? parseInt(form.dossard, 10) : null,
      club:      form.club.trim() || null,
      temps:     form.temps.trim() || null,
      points:    form.points ? parseInt(form.points, 10) : null,
      dns:       form.dns,
      dnf:       form.dnf,
    };

    const res  = await fetch(`/api/admin/competitions/${competitionId}/resultats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultats: [entry] }),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) { setSaveMsg(json.error ?? "Erreur"); return; }

    setSaveMsg("Ajouté ✓");
    notify({
      course: competitionNom,
      category: entry.categorie,
      href: `/admin/competitions/${competitionId}`,
    });
    setForm(f => ({ ...EMPTY_FORM, categorie: f.categorie }));
    setTimeout(() => setSaveMsg(""), 2000);
    await fetchResultats();
  }

  // ── Edition inline ──────────────────────────────────────────────────────
  async function saveEdit(id: string) {
    if (!editFields) return;
    setSaving(true);
    // Reconstruire la ligne complète à partir de l'existant
    const original = resultats.find(r => r.id === id);
    if (!original) { setSaving(false); return; }

    const updated = { ...original, ...editFields };

    const res = await fetch(`/api/admin/competitions/${competitionId}/resultats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultats: [updated] }),
    });
    setSaving(false);
    if (res.ok) {
      setEditId(null);
      await fetchResultats();
    }
  }

  // ── Affichage ────────────────────────────────────────────────────────────
  const grouped = resultats.reduce<Record<string, Resultat[]>>((acc, r) => {
    (acc[r.categorie] ??= []).push(r);
    return acc;
  }, {});

  const sortedCategories = Object.keys(grouped).sort();

  const inputCls = "bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-[11px] px-4 py-3 text-white font-archivo text-[13.5px] placeholder:text-[#4a6a7a] outline-none focus:border-[rgba(40,215,230,.5)] focus:bg-[rgba(40,215,230,.04)] transition-colors";
  const labelCls = "font-grotesk font-bold text-[9.5px] tracking-[.14em] uppercase text-[#7c9aaa] mb-1.5";

  return (
    <div className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[18px] p-6 mt-6">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-grotesk font-bold text-[10px] tracking-[.18em] uppercase text-[#7c9aaa]">
            Résultats
          </h2>
          <p className="font-archivo text-[12px] text-[#5c7c8c] mt-0.5">
            {loading
              ? "Chargement…"
              : resultats.length === 0
                ? "Aucun résultat enregistré"
                : `${resultats.length} athlètes dans ${sortedCategories.length} catégorie${sortedCategories.length > 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Import PDF */}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importState === "uploading"}
            className={`inline-flex items-center gap-2 font-archivo font-bold text-[12.5px] px-4 py-2 rounded-[10px] border transition-colors disabled:opacity-50 ${
              importState === "ok"
                ? "text-[#a0f0a0] border-[rgba(160,240,160,.3)] bg-[rgba(160,240,160,.07)]"
                : importState === "error"
                  ? "text-red-400 border-red-500/30 bg-red-500/08"
                  : "text-[#28D7E6] border-[rgba(40,215,230,.3)] hover:bg-[rgba(40,215,230,.08)]"
            }`}
          >
            {importState === "uploading" ? (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2v6h6M12 18v-6M9 15l3-3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {importState === "uploading" ? "Import…" : "Importer PDF / TXT"}
          </button>

          {/* Saisie manuelle */}
          <button
            onClick={() => setShowManual(v => !v)}
            className="inline-flex items-center gap-2 font-archivo font-bold text-[12.5px] px-4 py-2 rounded-[10px] border border-[var(--border-2)] text-[#7c9aaa] hover:text-white hover:border-[rgba(255,255,255,.2)] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Saisie manuelle
          </button>

          {resultats.length > 0 && (
            <button
              onClick={clearAll}
              className="w-9 h-9 flex items-center justify-center rounded-[9px] border border-[var(--border-2)] text-[#5c7c8c] hover:border-red-500/40 hover:text-red-400 transition-colors"
              title="Effacer tous les résultats"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Message import */}
      {importMsg && (
        <div className={`font-archivo text-[12.5px] mb-4 ${importState === "error" ? "text-red-400" : "text-[#a0f0a0]"}`}>
          {importMsg}
        </div>
      )}

      {/* Formulaire saisie manuelle */}
      {showManual && (
        <form onSubmit={handleAddManual} className="bg-[rgba(40,215,230,.04)] border border-[rgba(40,215,230,.2)] rounded-[14px] p-4 mb-5">
          <p className="font-grotesk font-bold text-[9.5px] tracking-[.14em] uppercase text-[#28D7E6] mb-4">
            Ajouter un résultat
          </p>
          <div className="grid grid-cols-12 gap-3">
            {/* Catégorie */}
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className={labelCls}>Catégorie *</label>
              <select
                required
                value={form.categorie}
                onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
                className={`${inputCls} appearance-none`}
              >
                <option value="" className="bg-[#0a2a3d]">— Choisir —</option>
                {/* Catégories déjà dans les résultats en premier */}
                {sortedCategories.length > 0 && (
                  <optgroup label="Déjà importées">
                    {sortedCategories.map(c => (
                      <option key={c} value={c} className="bg-[#0a2a3d]">{c}</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Toutes les catégories">
                  {ATHLETE_CATEGORIES.filter(c => !sortedCategories.includes(c)).map(c => (
                    <option key={c} value={c} className="bg-[#0a2a3d]">{c}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            {/* Nom */}
            <div className="col-span-3 flex flex-col gap-1.5">
              <label className={labelCls}>
                Nom Prénom *
                {partants.length > 0 && (
                  <span className="ml-2 normal-case tracking-normal font-normal text-[#5c7c8c]">
                    ({partants.length} partants)
                  </span>
                )}
              </label>
              <input
                required
                type="text"
                list="partants-datalist"
                placeholder="FONTAINE Lucas"
                value={form.nom}
                onChange={e => {
                  const val = e.target.value;
                  const match = partants.find(p => p.nom.toLowerCase() === val.toLowerCase());
                  setForm(f => ({
                    ...f,
                    nom:     val,
                    club:    match ? (match.club ?? f.club) : f.club,
                    dossard: match ? match.code_bateau : f.dossard,
                  }));
                }}
                className={inputCls}
              />
              <datalist id="partants-datalist">
                {partants.map(p => (
                  <option key={p.id} value={p.nom} />
                ))}
              </datalist>
            </div>
            {/* Club */}
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className={labelCls}>Club</label>
              <input
                type="text"
                placeholder="auto"
                value={form.club}
                onChange={e => setForm(f => ({ ...f, club: e.target.value }))}
                className={`${inputCls} ${form.club && partants.find(p => p.club === form.club) ? "border-[rgba(40,215,230,.35)]" : ""}`}
              />
            </div>
            {/* Rang */}
            <div className="col-span-1 flex flex-col gap-1.5">
              <label className={labelCls}>Clt</label>
              <input
                type="number"
                min="1"
                placeholder="1"
                value={form.rang}
                onChange={e => setForm(f => ({ ...f, rang: e.target.value, dns: false, dnf: false }))}
                disabled={form.dns || form.dnf}
                className={`${inputCls} disabled:opacity-40`}
              />
            </div>
            {/* Temps */}
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className={labelCls}>Meilleur tps</label>
              <input
                type="text"
                placeholder="1:21.63"
                value={form.temps}
                onChange={e => setForm(f => ({ ...f, temps: e.target.value }))}
                disabled={form.dns}
                className={`${inputCls} disabled:opacity-40`}
              />
            </div>
            {/* Points */}
            <div className="col-span-1 flex flex-col gap-1.5">
              <label className={labelCls}>Pts</label>
              <input
                type="number"
                min="0"
                placeholder="79"
                value={form.points}
                onChange={e => setForm(f => ({ ...f, points: e.target.value }))}
                disabled={form.dns}
                className={`${inputCls} disabled:opacity-40`}
              />
            </div>
            {/* DNS / DNF */}
            <div className="col-span-1 flex flex-col gap-1.5">
              <label className={labelCls}>Statut</label>
              <div className="flex flex-col gap-1.5 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.dns}
                    onChange={e => setForm(f => ({ ...f, dns: e.target.checked, dnf: false, rang: "", temps: "", points: "" }))}
                    className="rounded"
                  />
                  <span className="font-archivo text-[11px] text-[#7c9aaa]">Abs</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.dnf}
                    onChange={e => setForm(f => ({ ...f, dnf: e.target.checked, dns: false, rang: "" }))}
                    className="rounded"
                  />
                  <span className="font-archivo text-[11px] text-[#7c9aaa]">Abd</span>
                </label>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              type="submit"
              disabled={saving || !form.categorie || !form.nom}
              className="bg-[rgba(40,215,230,.12)] border border-[rgba(40,215,230,.35)] text-[#28D7E6] font-archivo font-bold text-[13px] px-5 py-2.5 rounded-[10px] hover:bg-[rgba(40,215,230,.2)] transition-colors disabled:opacity-50"
            >
              {saving ? "…" : "Ajouter ce résultat"}
            </button>
            {saveMsg && (
              <span className={`font-archivo text-[12.5px] ${saveMsg.includes("Erreur") || saveMsg.includes("error") ? "text-red-400" : "text-[#a0f0a0]"}`}>
                {saveMsg}
              </span>
            )}
          </div>
        </form>
      )}

      {/* ── Résultats par catégorie ── */}
      {!loading && sortedCategories.length === 0 && !showManual && (
        <p className="font-archivo text-[13px] text-[#5c7c8c]">
          Importe le PDF de résultats FFCK ou utilise la saisie manuelle.
        </p>
      )}

      {sortedCategories.map(cat => {
        const rows = grouped[cat]
          .slice()
          .sort((a, b) => {
            if (a.rang !== null && b.rang !== null) return a.rang - b.rang;
            if (a.rang !== null) return -1;
            if (b.rang !== null) return 1;
            return a.nom.localeCompare(b.nom);
          });

        return (
          <div key={cat} className="mb-6">
            <div className="font-grotesk font-bold text-[9.5px] uppercase tracking-[.16em] text-[#7c9aaa] px-1 pb-2 flex items-center gap-2">
              <span>{cat}</span>
              <span className="text-[#3a5c6c]">— {rows.length} athlète{rows.length > 1 ? "s" : ""}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full font-archivo text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--border-2)]">
                    {["Clt", "Nom", "Club", "Tps", "Pts", ""].map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left font-grotesk font-bold text-[9px] tracking-[.1em] uppercase text-[#5c7c8c] whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <Fragment key={r.id}>
                      {editId === r.id ? (
                        <tr className="border-b border-[var(--border-2)] bg-[rgba(40,215,230,.04)]">
                          <td className="px-3 py-2">
                            <input
                              type="number" min="1"
                              value={editFields.rang ?? ""}
                              onChange={e => setEditFields(f => ({ ...f, rang: parseInt(e.target.value) || null }))}
                              className="w-14 bg-[rgba(40,215,230,.08)] border border-[rgba(40,215,230,.4)] rounded-[7px] px-2 py-1 text-[#28D7E6] text-center outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={editFields.nom ?? r.nom}
                              onChange={e => setEditFields(f => ({ ...f, nom: e.target.value }))}
                              className="w-full bg-[rgba(255,255,255,.06)] border border-[var(--border-2)] rounded-[7px] px-2 py-1 text-white outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-[#7c9aaa]">{r.club ?? "—"}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={editFields.temps ?? r.temps ?? ""}
                              onChange={e => setEditFields(f => ({ ...f, temps: e.target.value || null }))}
                              placeholder="1:21.63"
                              className="w-24 bg-[rgba(255,255,255,.06)] border border-[var(--border-2)] rounded-[7px] px-2 py-1 text-white outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={editFields.points ?? r.points ?? ""}
                              onChange={e => setEditFields(f => ({ ...f, points: parseInt(e.target.value) || null }))}
                              className="w-16 bg-[rgba(255,255,255,.06)] border border-[var(--border-2)] rounded-[7px] px-2 py-1 text-white outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 flex items-center gap-2">
                            <button onClick={() => saveEdit(r.id)} className="text-[#28D7E6] font-bold text-[11px] hover:underline">✓</button>
                            <button onClick={() => setEditId(null)} className="text-[#5c7c8c] text-[11px] hover:text-white">✕</button>
                          </td>
                        </tr>
                      ) : (
                        <tr
                          key={r.id}
                          className="border-b border-[var(--border-2)] hover:bg-white/[.015] cursor-pointer"
                          onClick={() => { setEditId(r.id); setEditFields({}); }}
                          title="Cliquer pour modifier"
                        >
                          <td className="px-3 py-2 font-bold text-[#28D7E6] w-10">
                            {r.dns ? <span className="text-[#5c7c8c] font-normal">Abs</span>
                              : r.dnf ? <span className="text-[#FF7A45] font-normal">Abd</span>
                              : (r.rang ?? "—")}
                          </td>
                          <td className="px-3 py-2 font-semibold text-white">{r.nom}</td>
                          <td className="px-3 py-2 text-[#7c9aaa] truncate max-w-[180px]">{r.club ?? "—"}</td>
                          <td className="px-3 py-2 text-[#9fbac6] font-mono">{r.temps ?? "—"}</td>
                          <td className="px-3 py-2 text-[#7c9aaa]">{r.points ?? "—"}</td>
                          <td className="px-3 py-2" />
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
