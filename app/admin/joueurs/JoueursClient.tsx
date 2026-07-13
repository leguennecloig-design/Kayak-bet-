"use client";

import { useEffect, useRef, useState } from "react";

type UserResult = {
  id: string;
  username: string | null;
  email: string | null;
  balance: number;
  avatarUrl: string | null;
};

export default function JoueursClient() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selected, setSelected] = useState<UserResult | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q.trim())}`);
        const json = await res.json();
        setResults(json.users ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  function selectUser(u: UserResult) {
    setSelected(u);
    setAmount("");
    setReason("");
    setState("idle");
    setMsg("");
  }

  async function adjust(sign: 1 | -1) {
    if (!selected) return;
    const n = Math.abs(Number(amount));
    if (!Number.isFinite(n) || n <= 0) {
      setState("error");
      setMsg("Montant invalide");
      return;
    }
    setState("loading");
    setMsg("");
    try {
      const res = await fetch(`/api/admin/users/${selected.id}/adjust-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: sign * n, reason: reason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      setSelected({ ...selected, balance: json.newBalance });
      setState("ok");
      setMsg(`✓ Nouveau solde : ${json.newBalance.toLocaleString("fr-FR")} cr.`);
      setAmount("");
      setReason("");
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error ? e.message : "Erreur inconnue");
    }
  }

  const inputCls = "bg-[rgba(255,255,255,.05)] border border-[var(--border-2)] rounded-[11px] px-4 py-3 text-white font-archivo text-[13.5px] placeholder:text-[#4a6a7a] outline-none focus:border-[rgba(40,215,230,.5)] focus:bg-[rgba(40,215,230,.04)] transition-colors w-full";
  const labelCls = "font-grotesk font-bold text-[9.5px] tracking-[.14em] uppercase text-[#7c9aaa] mb-1.5 block";

  return (
    <div className="max-w-xl">
      <h1 className="font-anton italic uppercase text-white text-[36px] leading-[0.9]">
        Gestion des<br /><span className="text-cyan">joueurs</span>
      </h1>
      <p className="font-archivo text-[13px] text-[#7c9aaa] mt-3 mb-8 leading-relaxed">
        Cherche un joueur par pseudo ou email pour ajuster son solde manuellement.
      </p>

      <div className="mb-6">
        <input
          className={inputCls}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pseudo ou email…"
        />
      </div>

      {searching && <p className="font-archivo text-[13px] text-[#5c7c8c]">Recherche…</p>}

      {!selected && results.length > 0 && (
        <div className="flex flex-col gap-2 mb-6">
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => selectUser(u)}
              className="flex items-center gap-3 bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] hover:border-[rgba(40,215,230,.4)] rounded-[12px] px-4 py-3 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[rgba(40,215,230,.15)] flex items-center justify-center flex-none overflow-hidden">
                {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-cyan font-bold text-[12px]">{(u.username ?? "?").slice(0, 2).toUpperCase()}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-archivo font-extrabold text-[13.5px] text-white truncate">{u.username ?? "(sans pseudo)"}</div>
                <div className="font-archivo text-[11.5px] text-[#5c7c8c] truncate">{u.email}</div>
              </div>
              <div className="font-grotesk font-bold text-[13px] text-[#28D7E6] flex-none">{u.balance.toLocaleString("fr-FR")} cr.</div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[18px] p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-archivo font-extrabold text-[15px] text-white">{selected.username ?? "(sans pseudo)"}</div>
              <div className="font-archivo text-[12px] text-[#5c7c8c]">{selected.email}</div>
            </div>
            <button onClick={() => setSelected(null)} className="font-archivo text-[12.5px] text-[#7c9aaa] hover:text-white transition-colors">
              ← Changer
            </button>
          </div>

          <div className="font-anton italic text-[28px] text-[#28D7E6]">
            {selected.balance.toLocaleString("fr-FR")} <span className="text-[14px] not-italic font-archivo font-bold text-[#7c9aaa]">cr.</span>
          </div>

          <div>
            <label className={labelCls}>Montant</label>
            <input
              className={inputCls}
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex : 500"
            />
          </div>
          <div>
            <label className={labelCls}>Raison <span className="normal-case text-[#5c7c8c]">(optionnel, visible dans l'historique du joueur)</span></label>
            <input
              className={inputCls}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex : geste commercial, correction bug…"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => adjust(1)}
              disabled={state === "loading"}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#28D7E6] to-[#11C2C2] text-[#0A2A3D] font-archivo font-bold text-[13px] px-5 py-3 rounded-[10px] hover:-translate-y-[1px] transition-transform disabled:opacity-40"
            >
              + Ajouter
            </button>
            <button
              onClick={() => adjust(-1)}
              disabled={state === "loading"}
              className="flex-1 inline-flex items-center justify-center gap-2 border border-[rgba(255,122,69,.4)] text-[#FF7A45] font-archivo font-bold text-[13px] px-5 py-3 rounded-[10px] hover:bg-[rgba(255,122,69,.08)] transition-colors disabled:opacity-40"
            >
              − Retirer
            </button>
          </div>

          {msg && (
            <p className={`font-archivo text-[12.5px] ${state === "error" ? "text-red-400" : "text-[#a0f0a0]"}`}>
              {msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
