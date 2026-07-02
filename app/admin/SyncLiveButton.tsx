"use client";

import { useState } from "react";

export default function SyncLiveButton() {
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [info,  setInfo]  = useState("");

  async function sync() {
    if (state === "loading") return;
    setState("loading");
    try {
      const res  = await fetch("/api/live/sync");
      const json = await res.json();
      if (res.ok) {
        setState("ok");
        setInfo(`${json.count ?? 0} résultats · ${json.competitions?.length ?? 0} compét.`);
      } else {
        setState("err");
        setInfo(json.error ?? "Erreur");
      }
    } catch {
      setState("err");
      setInfo("Erreur réseau");
    } finally {
      setTimeout(() => setState("idle"), 4000);
    }
  }

  const label = state === "loading" ? "Sync…" : state === "ok" ? `✓ ${info}` : state === "err" ? `✗ ${info}` : "Sync Live FFCK";
  const style = state === "ok"
    ? "bg-[rgba(40,215,230,.12)] text-[#28D7E6] border-[rgba(40,215,230,.3)]"
    : state === "err"
      ? "bg-[rgba(255,122,69,.12)] text-[#FF7A45] border-[rgba(255,122,69,.3)]"
      : "bg-[rgba(255,255,255,.05)] text-[#9fbac6] border-[var(--border-2)] hover:text-[#28D7E6] hover:border-[rgba(40,215,230,.4)]";

  return (
    <button
      onClick={sync}
      disabled={state === "loading"}
      className={`inline-flex items-center gap-2 font-grotesk font-bold text-[10px] tracking-[.1em] uppercase border rounded-[9px] px-4 py-2.5 transition-all ${style}`}
    >
      {state === "loading" ? (
        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity=".25" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
          <path d="M4 12a8 8 0 0 1 14.5-4.6M20 12a8 8 0 0 1-14.5 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M18 4.5v4h-4M6 19.5v-4H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {label}
    </button>
  );
}
