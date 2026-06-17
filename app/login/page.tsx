"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

type Mode = "login" | "signup" | "sent";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setMode("sent");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else location.href = "/";
    }

    setLoading(false);
  }

  if (mode === "sent") {
    return (
      <main className="min-h-screen bg-deep flex items-center justify-center px-4">
        <div className="w-full max-w-[420px] text-center">
          <div
            className="w-[64px] h-[64px] rounded-[18px] flex items-center justify-center mx-auto mb-6"
            style={{ background: "linear-gradient(150deg,rgba(40,215,230,.22),rgba(31,115,255,.15))" }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
              <path d="M4 4h16v16H4z" stroke="#28D7E6" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M4 4l8 9 8-9" stroke="#28D7E6" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="font-anton italic uppercase text-white text-[36px] leading-[0.9]">
            Vérifie<br />ton mail
          </h1>
          <p className="text-soft text-[15px] leading-[1.6] mt-4 max-w-[300px] mx-auto">
            Un lien de confirmation a été envoyé à <strong className="text-white">{email}</strong>.
            Clique dessus pour activer ton compte.
          </p>
          <button
            onClick={() => setMode("login")}
            className="mt-8 text-cyan font-archivo font-bold text-[14px] hover:underline"
          >
            ← Retour à la connexion
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-deep flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <a href="/" className="flex items-center gap-3 mb-10">
          <svg viewBox="0 0 32 36" fill="none" className="w-8 h-9">
            <path d="M16 1C9 9 4 15 4 22a12 12 0 0 0 24 0C28 15 23 9 16 1Z" fill="url(#lg)" />
            <path d="M8 25c3 0 3 3 6 3s3-3 6-3 3 3 6 3" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <defs>
              <linearGradient id="lg" x1="4" y1="1" x2="28" y2="35" gradientUnits="userSpaceOnUse">
                <stop stopColor="#28D7E6" />
                <stop offset="1" stopColor="#1F73FF" />
              </linearGradient>
            </defs>
          </svg>
          <span className="font-anton italic uppercase text-white text-[22px] tracking-[.01em]">
            Kayak<span className="text-cyan">bet</span>
          </span>
        </a>

        {/* Card */}
        <div
          className="rounded-[24px] border border-[var(--border-2)] px-8 py-9"
          style={{ background: "radial-gradient(130% 160% at 90% -20%, #11405C, #0A2A3D 60%)" }}
        >
          <h1 className="font-anton italic uppercase text-white text-[32px] leading-[0.9] mb-1">
            {mode === "login" ? "Connexion" : "Créer un compte"}
          </h1>
          <p className="text-soft text-[14px] mb-7">
            {mode === "login"
              ? "Bienvenue de retour sur Kayakbet."
              : "Rejoins la communauté, 100% gratuit."}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-[6px]">
              <label className="font-grotesk font-bold text-[11px] tracking-[.1em] uppercase text-[#7C9AAA]">
                Adresse e-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@exemple.fr"
                className="w-full bg-[rgba(255,255,255,.06)] border border-[var(--border-2)] rounded-[12px] px-4 py-[13px] text-white font-archivo text-[14px] placeholder:text-[#4a6a7a] outline-none focus:border-[rgba(40,215,230,.5)] focus:bg-[rgba(40,215,230,.04)] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-[6px]">
              <label className="font-grotesk font-bold text-[11px] tracking-[.1em] uppercase text-[#7C9AAA]">
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                className="w-full bg-[rgba(255,255,255,.06)] border border-[var(--border-2)] rounded-[12px] px-4 py-[13px] text-white font-archivo text-[14px] placeholder:text-[#4a6a7a] outline-none focus:border-[rgba(40,215,230,.5)] focus:bg-[rgba(40,215,230,.04)] transition-colors"
              />
            </div>

            {error && (
              <p className="text-[#FF7A45] font-archivo text-[13px] bg-[rgba(255,122,69,.1)] border border-[rgba(255,122,69,.25)] rounded-[10px] px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mt-1 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? "Chargement…"
                : mode === "login"
                ? "Se connecter"
                : "Créer mon compte"}
            </button>
          </form>
        </div>

        {/* Toggle */}
        <p className="text-center text-soft text-[14px] mt-6 font-archivo">
          {mode === "login" ? "Pas encore de compte ? " : "Déjà membre ? "}
          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            className="text-cyan font-bold hover:underline"
          >
            {mode === "login" ? "Créer un compte" : "Connexion"}
          </button>
        </p>

      </div>
    </main>
  );
}
