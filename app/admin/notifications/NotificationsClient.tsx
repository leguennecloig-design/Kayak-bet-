"use client";

import { useState } from "react";

type Template = { label: string; title: string; body: string; url?: string };

// Notices pré-enregistrées : Loig peut en choisir une pour pré-remplir le
// formulaire (puis ajuster/envoyer), au lieu de tout retaper à chaque fois.
const TEMPLATES: Template[] = [
  {
    label: "Nouvelle compétition",
    title: "Nouvelle compétition disponible !",
    body: "Les paris sont ouverts — viens tenter ta chance sur Kayakbet.",
    url: "/app",
  },
  {
    label: "Clôture des paris imminente",
    title: "Dernière chance de parier !",
    body: "Les paris ferment bientôt sur la compétition en cours. Ne rate pas ta chance.",
    url: "/app",
  },
  {
    label: "Résultats disponibles",
    title: "Les résultats sont tombés 🏁",
    body: "Va voir si tes pronostics étaient les bons !",
    url: "/app",
  },
  {
    label: "Maintenance prévue",
    title: "Maintenance en cours",
    body: "Kayakbet est en maintenance quelques minutes. Merci de ta patience, ça sera vite réglé.",
    url: "/app",
  },
  {
    label: "Nouvelle fonctionnalité",
    title: "Nouveauté sur Kayakbet",
    body: "On a ajouté une nouvelle fonctionnalité — va y jeter un œil !",
    url: "/app",
  },
  {
    label: "Relance joueurs inactifs",
    title: "On t'a pas vu récemment 👀",
    body: "De nouvelles compétitions t'attendent sur Kayakbet. Reviens tenter ta chance !",
    url: "/app",
  },
];

export default function NotificationsClient() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  function applyTemplate(t: Template) {
    setTitle(t.title);
    setBody(t.body);
    setUrl(t.url ?? "");
    setState("idle");
    setMsg("");
  }

  async function send() {
    if (!title.trim() || !body.trim()) return;
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), url: url.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      setState("ok");
      setMsg(`✓ Envoyée à ${json.sent} abonné${json.sent !== 1 ? "s" : ""}.`);
      setTitle("");
      setBody("");
      setUrl("");
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
        Notifications<br /><span className="text-cyan">push</span>
      </h1>
      <p className="font-archivo text-[13px] text-[#7c9aaa] mt-3 mb-8 leading-relaxed">
        Diffusion manuelle immédiate à tous les joueurs actuellement abonnés aux notifications push.
      </p>

      <div className="mb-6">
        <label className={labelCls}>Notices pré-enregistrées</label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => applyTemplate(t)}
              className="bg-[rgba(255,255,255,.04)] border border-[var(--border-2)] rounded-[9px] px-3.5 py-2 text-[12px] font-archivo text-[#cfe8ee] hover:border-[rgba(40,215,230,.5)] hover:text-white hover:bg-[rgba(40,215,230,.06)] transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[rgba(255,255,255,.03)] border border-[var(--border-2)] rounded-[18px] p-6 flex flex-col gap-4">
        <div>
          <label className={labelCls}>Titre</label>
          <input
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Nouvelle compétition !"
            maxLength={80}
          />
        </div>
        <div>
          <label className={labelCls}>Message</label>
          <textarea
            className={inputCls}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Le message affiché dans la notification"
            rows={3}
            maxLength={200}
          />
        </div>
        <div>
          <label className={labelCls}>URL au clic (optionnel)</label>
          <input
            className={inputCls}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/app (par défaut)"
          />
        </div>

        <button
          onClick={send}
          disabled={state === "loading" || !title.trim() || !body.trim()}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#28D7E6] to-[#11C2C2] text-[#0A2A3D] font-archivo font-bold text-[13px] px-5 py-3 rounded-[10px] hover:-translate-y-[1px] transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
        >
          {state === "loading" ? "Envoi…" : "Envoyer à tous les abonnés"}
        </button>

        {msg && (
          <p className={`font-archivo text-[12.5px] ${state === "error" ? "text-red-400" : "text-[#a0f0a0]"}`}>
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
