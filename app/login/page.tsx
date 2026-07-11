"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import Turnstile, { TURNSTILE_SITE_KEY } from "@/app/components/Turnstile";
import AvatarUpload from "@/app/components/AvatarUpload";
import "./login.css";

type Mode = "login" | "signup" | "sent" | "forgot" | "reset-sent" | "welcome" | "credits" | "onboarding" | "push-prompt";

const PUSH_PROMPT_DISMISSED_KEY = "kb_push_prompt_dismissed";
const REFERRAL_CODE_KEY = "kb_referral_code";
type OnbStep = "profile" | "setup" | "athlete" | "source" | "push";

type AthleteResult = {
  id: string;
  nom: string;
  prenom: string | null;
  club: string | null;
  categorie: string | null;
  rangNational: number | null;
  saison: string | null;
  claimed: boolean;
};

/* ---- Icons ---- */
const EyeOpen = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M1 12s4-7.5 11-7.5S23 12 23 12s-4 7.5-11 7.5S1 12 1 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);
const EyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M3 3l18 18M10.6 10.7a3 3 0 0 0 4.2 4.2M9.4 5.5A11 11 0 0 1 12 5.5c7 0 11 6.5 11 6.5a15 15 0 0 1-4 4.3M6.5 6.8A15 15 0 0 0 1 12s4 7.5 11 7.5c1.6 0 3-.3 4.3-.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DropLogo = () => (
  <svg className="w-[30px] h-[34px] flex-none" viewBox="0 0 34 38" fill="none" aria-hidden="true">
    <path d="M17 2C10 12 4 18.5 4 25a13 13 0 0 0 26 0C30 18.5 24 12 17 2Z" fill="url(#lp-dh)"/>
    <path d="M9.5 26.4c2.4 0 2.4 2.4 4.8 2.4s2.4-2.4 4.8-2.4 2.4 2.4 4.8 2.4" stroke="#fff" strokeWidth="1.9" fill="none" strokeLinecap="round"/>
    <path d="M10.3 31.5c2.1 0 2.1 2 4.2 2s2.1-2 4.2-2" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".7"/>
    <defs>
      <linearGradient id="lp-dh" x1="4" y1="2" x2="30" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#28D7E6"/><stop offset="1" stopColor="#1F73FF"/>
      </linearGradient>
    </defs>
  </svg>
);

/* ================================================================
   Welcome overlay — shown after successful login
================================================================ */
function WelcomeOverlay({ onDone }: { onDone: () => void }) {
  const cbRef = useRef(onDone);
  cbRef.current = onDone;

  useEffect(() => {
    const t = setTimeout(() => cbRef.current(), 2400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="lp-welcome" role="status" aria-live="polite">
      <div className="lp-w-coin" aria-hidden="true">
        <div className="lp-w-face"><span>KB</span></div>
      </div>
      <h2 className="lp-w-heading">Bon retour parmi nous</h2>
      <p className="lp-w-sub">On t'emmène vers la ligne de départ…</p>
    </div>
  );
}

/* ================================================================
   Credits reveal — shown once, à la création du compte
================================================================ */
function CreditsRevealOverlay({ balance, onDone }: { balance: number; onDone: () => void }) {
  const cbRef = useRef(onDone);
  cbRef.current = onDone;

  useEffect(() => {
    const t = setTimeout(() => cbRef.current(), 2400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="lp-welcome" role="status" aria-live="polite">
      <div className="lp-w-coin" aria-hidden="true">
        <div className="lp-w-face"><span>KB</span></div>
      </div>
      <h2 className="lp-w-heading">Bienvenue à bord</h2>
      <p className="lp-credits-amount">+{balance.toLocaleString("fr-FR")} <span>crédits</span></p>
      <p className="lp-w-sub">Offerts pour démarrer — à toi de jouer !</p>
    </div>
  );
}

/* ================================================================
   Onboarding flow — 3 steps, shown only on first login
================================================================ */
function OnboardingFlow({ onDone }: { onDone: () => void }) {
  const supabase = createClient();
  const [steps, setSteps] = useState<OnbStep[]>(["profile", "setup", "source", "push"]);
  const push = usePushNotifications();
  const [stepIdx, setStepIdx] = useState(0);
  const [profile, setProfile] = useState<"athlete" | "bettor" | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [athleteResults, setAthleteResults] = useState<AthleteResult[]>([]);
  const [athleteLoading, setAthleteLoading] = useState(false);
  const [confirming, setConfirming] = useState<AthleteResult | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");

  // Étape "setup" — pp / bio / pseudo, juste après le choix de profil.
  const [userId, setUserId] = useState("");
  const [setupInitials, setSetupInitials] = useState("??");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupError, setSetupError] = useState("");
  const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? "";
      setUserId(id);
      const email = data.user?.email ?? "";
      const base = email.split("@")[0].replace(/[._-]+/g, " ").trim();
      if (base) setSetupInitials(base.slice(0, 2).toUpperCase());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStep = steps[stepIdx];

  function selectProfile(p: "athlete" | "bettor") {
    setProfile(p);
    if (p === "athlete" && !steps.includes("athlete")) {
      setSteps(["profile", "setup", "athlete", "source", "push"]);
    } else if (p === "bettor" && steps.includes("athlete")) {
      setSteps(["profile", "setup", "source", "push"]);
    }
  }

  function goNext() {
    if (stepIdx + 1 >= steps.length) { onDone(); return; }
    setStepIdx(i => i + 1);
  }

  async function saveSetupAndContinue() {
    const trimmedUsername = username.trim();
    if (trimmedUsername && !USERNAME_RE.test(trimmedUsername)) {
      setSetupError("Pseudo invalide : 3 à 20 caractères, lettres/chiffres/underscore uniquement");
      return;
    }
    setSetupSaving(true);
    setSetupError("");
    try {
      const updates: { username?: string; bio?: string } = {};
      if (trimmedUsername) updates.username = trimmedUsername;
      if (bio.trim()) updates.bio = bio.trim();
      for (const [key, value] of Object.entries(updates)) {
        const res = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: value }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? "Erreur");
        }
      }
      goNext();
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setSetupSaving(false);
    }
  }

  useEffect(() => {
    if (debouncedSearch.trim().length < 2) { setAthleteResults([]); return; }
    let cancelled = false;
    setAthleteLoading(true);
    fetch(`/api/athletes/search?q=${encodeURIComponent(debouncedSearch)}`)
      .then(res => res.json())
      .then((data) => { if (!cancelled) setAthleteResults(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setAthleteResults([]); })
      .finally(() => { if (!cancelled) setAthleteLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedSearch]);

  async function confirmAthlete() {
    if (!confirming) return;
    setClaiming(true);
    setClaimError("");
    try {
      const { data, error } = await supabase.rpc("claim_athlete", { athlete_uuid: confirming.id });
      if (error) throw error;
      if (!data?.ok) {
        setClaimError(
          data?.error === "already_claimed"
            ? "Cet athlète a déjà été revendiqué par un autre compte."
            : data?.error === "already_linked_other"
            ? "Tu as déjà lié un profil athlète. Contacte le support pour le modifier."
            : "Impossible de lier ce profil."
        );
        setConfirming(null);
        return;
      }
      goNext();
    } catch {
      setClaimError("Erreur réseau, réessaie.");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="lp-onb">
      {/* Ambient bg reuse */}
      <div className="lp-bg" />
      <div className="lp-glow g1" /><div className="lp-glow g2" />

      <div className="lp-onb-card">
        <div className="lp-onb-inner">

          {/* Progress dots */}
          <div className="lp-onb-dots">
            {steps.map((_, i) => (
              <span key={i} className={i < stepIdx ? "done" : i === stepIdx ? "on" : ""} />
            ))}
          </div>

          {/* Step 1 — profile type */}
          {currentStep === "profile" && (
            <div className="lp-onb-step">
              <h2 className="lp-onb-title">Ton profil</h2>
              <p className="lp-onb-sub">Comment veux-tu vivre Kayakbet ?</p>
              <div className="lp-opt-grid">
                <div className={`lp-opt-card${profile === "athlete" ? " sel" : ""}`} role="button" tabIndex={0} onClick={() => selectProfile("athlete")} onKeyDown={e => e.key === "Enter" && selectProfile("athlete")}>
                  <div className="lp-opt-icon">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M8 3h8v4a4 4 0 0 1-8 0V3Z" stroke="#28D7E6" strokeWidth="1.8" strokeLinejoin="round"/>
                      <path d="M8 4H4v2a4 4 0 0 0 4 4M16 4h4v2a4 4 0 0 1-4 4M12 11v5m-4 4h8m-4-4v4" stroke="#28D7E6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="lp-opt-text"><b>Athlète &amp; parieur</b><span>Je participe aux courses et je parie</span></div>
                  <div className="lp-opt-check" />
                </div>
                <div className={`lp-opt-card${profile === "bettor" ? " sel" : ""}`} role="button" tabIndex={0} onClick={() => selectProfile("bettor")} onKeyDown={e => e.key === "Enter" && selectProfile("bettor")}>
                  <div className="lp-opt-icon">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M3 10a2 2 0 0 1 0-4h18a2 2 0 0 1 0 4 2 2 0 0 0 0 4 2 2 0 0 1 0 4H3a2 2 0 0 1 0-4 2 2 0 0 0 0-4Z" stroke="#28D7E6" strokeWidth="1.8" strokeLinejoin="round"/>
                      <path d="M14 6l-4 12" stroke="#28D7E6" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="lp-opt-text"><b>Parieur</b><span>Je pronostique sur le circuit</span></div>
                  <div className="lp-opt-check" />
                </div>
              </div>
              <button className="lp-btn-primary" disabled={!profile} onClick={goNext}>Continuer</button>
            </div>
          )}

          {/* Step 1b — configuration du profil (pp / pseudo / bio) */}
          {currentStep === "setup" && (
            <div className="lp-onb-step">
              <h2 className="lp-onb-title">Ton identité</h2>
              <p className="lp-onb-sub">Personnalise ton profil — tu pourras toujours changer ça plus tard.</p>

              <div className="lp-onb-avatar-row">
                {userId && (
                  <AvatarUpload
                    userId={userId}
                    avatarUrl={avatarUrl}
                    initials={setupInitials}
                    onUploaded={setAvatarUrl}
                  />
                )}
              </div>

              <label className="lp-onb-field">
                <span>Pseudo</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Ton pseudo public"
                  maxLength={20}
                />
              </label>

              <label className="lp-onb-field">
                <span>Bio</span>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value.slice(0, 280))}
                  placeholder="Quelques mots sur toi (optionnel)"
                  rows={3}
                />
              </label>

              {setupError && <p className="lp-onb-error">{setupError}</p>}

              <button className="lp-btn-primary" disabled={setupSaving} onClick={saveSetupAndContinue}>
                {setupSaving ? "…" : "Continuer"}
              </button>
              <button className="lp-btn-skip" onClick={goNext}>Passer</button>
            </div>
          )}

          {/* Step 2 — athlete search (conditional) */}
          {currentStep === "athlete" && !confirming && (
            <div className="lp-onb-step">
              <h2 className="lp-onb-title">Ton nom d'athlète</h2>
              <p className="lp-onb-sub">Retrouve-toi dans le classement officiel du circuit.</p>
              <div className="lp-onb-search">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  placeholder="Chercher ton nom…"
                  autoComplete="off"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {claimError && <p className="lp-onb-error">{claimError}</p>}
              <div className="lp-athlete-list">
                {athleteLoading ? (
                  <div className="lp-athlete-empty">Recherche…</div>
                ) : search.trim().length < 2 ? (
                  <div className="lp-athlete-empty">Tape au moins 2 lettres</div>
                ) : athleteResults.length === 0 ? (
                  <div className="lp-athlete-empty">Aucun athlète trouvé</div>
                ) : athleteResults.map(a => (
                  <div
                    key={a.id}
                    className="lp-athlete-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => setConfirming(a)}
                    onKeyDown={e => e.key === "Enter" && setConfirming(a)}
                  >
                    <div className="lp-av">{(a.prenom?.[0] ?? "") + (a.nom?.[0] ?? "")}</div>
                    <div className="lp-meta"><b>{a.prenom} {a.nom}</b><span>{a.club ?? "Circuit national"} · {a.categorie ?? ""}</span></div>
                  </div>
                ))}
              </div>
              <div className="lp-onb-row">
                <button className="lp-btn-skip" onClick={goNext}>Passer</button>
              </div>
            </div>
          )}

          {/* Step 2b — confirmation avant de lier l'athlète */}
          {currentStep === "athlete" && confirming && (
            <div className="lp-onb-step">
              <h2 className="lp-onb-title">C'est bien toi ?</h2>
              <p className="lp-onb-sub">Vérifie tes informations avant de confirmer.</p>
              <div className="lp-athlete-row sel" style={{ marginBottom: 22 }}>
                <div className="lp-av">{(confirming.prenom?.[0] ?? "") + (confirming.nom?.[0] ?? "")}</div>
                <div className="lp-meta">
                  <b>{confirming.prenom} {confirming.nom}</b>
                  <span>{confirming.club ?? "Circuit national"} · {confirming.categorie ?? ""}{confirming.rangNational ? ` · Rang national ${confirming.rangNational}` : ""}</span>
                </div>
              </div>
              <div className="lp-onb-row">
                <button className="lp-btn-skip" onClick={() => setConfirming(null)}>Ce n&apos;est pas moi</button>
                <button className="lp-btn-primary" disabled={claiming} onClick={confirmAthlete}>
                  {claiming ? "Confirmation…" : "Confirmer"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — how did you find us */}
          {currentStep === "source" && (
            <div className="lp-onb-step">
              <h2 className="lp-onb-title">Comment nous as-tu connu ?</h2>
              <p className="lp-onb-sub">Ça nous aide à faire connaître le circuit.</p>
              <div className="lp-chip-grid">
                {["Réseaux sociaux", "Un ami / bouche-à-oreille", "Recherche en ligne", "Presse / média", "Créateur de contenu", "Autre"].map(s => (
                  <button key={s} className={`lp-chip${source === s ? " sel" : ""}`} onClick={() => setSource(s)}>
                    {s}
                  </button>
                ))}
              </div>
              <button className="lp-btn-primary" disabled={!source} onClick={goNext}>Continuer</button>
            </div>
          )}

          {/* Step 4 — push notifications opt-in */}
          {currentStep === "push" && (
            <div className="lp-onb-step">
              <h2 className="lp-onb-title">Reste informé</h2>
              <p className="lp-onb-sub">
                Active les notifications pour savoir dès qu'un pari est réglé ou qu'une nouvelle compétition ouvre.
              </p>
              {push.supported ? (
                <>
                  <button
                    className="lp-btn-primary"
                    disabled={push.busy || push.subscribed}
                    onClick={async () => { const ok = await push.subscribe(); if (ok) goNext(); }}
                  >
                    {push.busy ? "…" : push.subscribed ? "Activées ✓" : "Activer les notifications"}
                  </button>
                  {push.error && <p className="lp-onb-sub" style={{ color: "#ff7a7a" }}>{push.error}</p>}
                </>
              ) : (
                <p className="lp-onb-sub">Non disponible sur cet appareil — tu pourras l&apos;activer plus tard depuis ton profil.</p>
              )}
              <button className="lp-btn-skip" onClick={goNext}>
                {push.subscribed ? "Terminer" : "Plus tard"}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Main login page
================================================================ */
export default function LoginPage() {
  const [mode,     setMode]     = useState<Mode>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("welcome") === "1"
      ? "welcome"
      : "login"
  );
  const [revealBalance, setRevealBalance] = useState(0);
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [remember, setRemember] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const push = usePushNotifications();

  // Capture le code de parrainage depuis l'URL (?ref=CODE) dès l'arrivée sur
  // la page, indépendamment du mode — doit survivre à la redirection OAuth
  // ou à la confirmation d'email avant d'être appliqué (voir onDone du mode
  // "welcome" plus bas), donc stocké en localStorage plutôt qu'en state.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) localStorage.setItem(REFERRAL_CODE_KEY, ref.trim().toUpperCase());
  }, []);

  // Rien à proposer (déjà abonné, ou pas supporté sur cet appareil) — on
  // n'affiche pas cet écran pour rien, direct dans l'app.
  useEffect(() => {
    if (mode === "push-prompt" && push.checked && (!push.supported || push.subscribed)) {
      location.href = "/app";
    }
  }, [mode, push.checked, push.supported, push.subscribed]);

  function dismissPushPrompt() {
    if (typeof window !== "undefined") localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, "1");
    location.href = "/app";
  }

  const supabase = createClient();

  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.add("js-anim");
    }
    const id = requestAnimationFrame(() => document.body.classList.add("lp-play"));
    return () => {
      cancelAnimationFrame(id);
      document.body.classList.remove("lp-play");
      document.documentElement.classList.remove("js-anim");
    };
  }, []);

  function resetCaptcha() {
    setCaptchaToken("");
    setCaptchaReset((n) => n + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError("Merci de valider la vérification anti-robot avant de continuer.");
      return;
    }

    setLoading(true);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/callback`,
        captchaToken: captchaToken || undefined,
      });
      if (error) { setError(error.message); resetCaptcha(); }
      else setMode("reset-sent");
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback`, captchaToken: captchaToken || undefined },
      });
      if (error) { setError(error.message); resetCaptcha(); }
      else setMode("sent");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken: captchaToken || undefined } });
      if (error) { setError(error.message); resetCaptcha(); }
      else { setMode("welcome"); }
    }

    setLoading(false);
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setPassword("");
    resetCaptcha();
  }

  /* ---- Welcome overlay ---- */
  if (mode === "welcome") {
    return (
      <>
        <div className="lp-bg" />
        <div className="lp-glow g1" /><div className="lp-glow g2" />
        <WelcomeOverlay onDone={() => {
          (async () => {
            // Applique un éventuel code de parrainage capturé à l'arrivée
            // (?ref=CODE) — no-op silencieux côté serveur si absent, déjà
            // utilisé, ou invalide. Retiré du localStorage dans tous les cas
            // pour ne jamais retenter indéfiniment.
            const refCode = typeof window !== "undefined" ? localStorage.getItem(REFERRAL_CODE_KEY) : null;
            if (refCode) {
              localStorage.removeItem(REFERRAL_CODE_KEY);
              try {
                await fetch("/api/referral/apply", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code: refCode }),
                });
              } catch {
                // pas bloquant — au pire le parrainage n'est pas appliqué
              }
            }

            try {
              const res = await fetch("/api/user/profile");
              // Ne teste `data.onboarded` que si la requête a réellement
              // réussi — sinon (ex: session pas encore propagée juste après
              // la connexion, réponse 401) `data.onboarded` vaut `undefined`,
              // et `!undefined` est vrai : un compte déjà onboardé se
              // retrouvait à refaire tout l'onboarding à chaque connexion.
              if (res.ok) {
                const data = await res.json();
                if (!data.onboarded) {
                  setRevealBalance(Number(data.balance ?? 0));
                  setMode("credits");
                  return;
                }
              }
            } catch {
              // en cas d'erreur réseau, on ne bloque pas l'utilisateur derrière
              // l'onboarding — on le laisse simplement entrer dans l'app.
            }
            // Compte existant : proposer les notifs une fois, sauf si déjà
            // refusé/ignoré précédemment (pas de relance à chaque connexion).
            if (typeof window !== "undefined" && !localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY)) {
              setMode("push-prompt");
              return;
            }
            location.href = "/app";
          })();
        }} />
      </>
    );
  }

  /* ---- Révélation des crédits de départ (création de compte) ---- */
  if (mode === "credits") {
    return (
      <>
        <div className="lp-bg" />
        <div className="lp-glow g1" /><div className="lp-glow g2" />
        <CreditsRevealOverlay balance={revealBalance} onDone={() => setMode("onboarding")} />
      </>
    );
  }

  /* ---- Onboarding (first login only) ---- */
  if (mode === "onboarding") {
    return (
      <OnboardingFlow onDone={() => {
        (async () => {
          try {
            await fetch("/api/user/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ onboarded: true }),
            });
          } catch {
            // pas bloquant — au pire l'onboarding réapparaîtra une fois de plus
          }
          location.href = "/app";
        })();
      }} />
    );
  }

  /* ---- Push prompt (comptes existants, une fois par compte) ---- */
  if (mode === "push-prompt") {
    return (
      <div className="lp-onb">
        <div className="lp-bg" />
        <div className="lp-glow g1" /><div className="lp-glow g2" />
        <div className="lp-onb-card">
          <div className="lp-onb-inner">
            <div className="lp-onb-step">
              <h2 className="lp-onb-title">Reste informé</h2>
              <p className="lp-onb-sub">
                Active les notifications pour savoir dès qu'un pari est réglé ou qu'une nouvelle compétition ouvre.
              </p>
              <button
                className="lp-btn-primary"
                disabled={push.busy}
                onClick={async () => { const ok = await push.subscribe(); if (ok) location.href = "/app"; }}
              >
                {push.busy ? "…" : "Activer les notifications"}
              </button>
              {push.error && <p className="lp-onb-sub" style={{ color: "#ff7a7a" }}>{push.error}</p>}
              <button className="lp-btn-skip" onClick={dismissPushPrompt}>Plus tard</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Email sent screens ---- */
  if (mode === "sent" || mode === "reset-sent") {
    const isSent = mode === "sent";
    return (
      <div className="lp-bg-bg min-h-screen flex flex-col items-center justify-center px-5">
        <div className="lp-bg" />
        <div className="lp-glow g1" /><div className="lp-glow g2" />
        <div className="relative z-10 text-center max-w-[340px]">
          <div
            className="w-16 h-16 rounded-[18px] flex items-center justify-center mx-auto mb-6"
            style={{ background: "linear-gradient(150deg,rgba(40,215,230,.22),rgba(31,115,255,.15))" }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
              <path d="M4 4h16v16H4z" stroke="#28D7E6" strokeWidth="1.7" strokeLinejoin="round"/>
              <path d="M4 4l8 9 8-9" stroke="#28D7E6" strokeWidth="1.7" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-anton italic uppercase text-white text-[36px] leading-[0.9] mb-4">
            {isSent ? <>Vérifie<br />ton mail</> : <>Lien<br />envoyé</>}
          </h1>
          <p className="text-soft text-[15px] leading-[1.6]">
            {isSent
              ? <>Un lien de confirmation a été envoyé à <strong className="text-white">{email}</strong>. Clique dessus pour activer ton compte.</>
              : <>Un lien de réinitialisation a été envoyé à <strong className="text-white">{email}</strong>.</>}
          </p>
          <button
            onClick={() => switchMode("login")}
            className="mt-8 text-cyan font-archivo font-bold text-[14px] hover:text-white transition-colors"
          >
            ← Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  const isForgot = mode === "forgot";
  const isSignup = mode === "signup";

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ fontFamily: "var(--font-archivo), system-ui, sans-serif", background: "var(--deep)", color: "var(--text)" }}
    >
      {/* Ambient background */}
      <div className="lp-bg" />
      <div className="lp-glow g1" /><div className="lp-glow g2" />
      <span className="lp-ring r1" /><span className="lp-ring r2" />
      <svg className="lp-waves" viewBox="0 0 1180 220" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path d="M-20 150c160 0 160-46 320-46s160 46 320 46 160-46 340-46 160 46 300 46" stroke="rgba(40,215,230,.12)" strokeWidth="2" fill="none"/>
        <path d="M-20 182c160 0 160-40 320-40s160 40 320 40 160-40 340-40 160 40 300 40" stroke="rgba(40,215,230,.07)" strokeWidth="2" fill="none"/>
      </svg>

      {/* Logo */}
      <a href="/" className="lp-logo relative z-10 flex items-center gap-3 mt-14 mb-9" aria-label="Kayakbet">
        <DropLogo />
        <span className="lp-wm-box">
          <span className="lp-wmtxt">Kayak<span className="b">bet</span></span>
          <svg className="lp-wmwave" viewBox="0 0 240 20" preserveAspectRatio="none" fill="none">
            <path d="M2 13c36 0 36-8 72-8s36 8 72 8 36-8 92-8" stroke="#28D7E6" strokeWidth="5" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
          </svg>
        </span>
      </a>

      {/* Stage */}
      <div className="relative z-10 flex flex-col items-center w-full px-5 pb-16 flex-1">
        <div className="lp-card-frame">
          <div className="lp-card">

            {/* Title */}
            <h1 className="font-anton italic uppercase text-white leading-[0.9] m-0" style={{ fontSize: "40px" }}>
              {isForgot ? "Mot de passe oublié" : isSignup ? "Créer un compte" : "Connexion"}
            </h1>
            <p className="text-[14.5px] mt-[10px] mb-0 leading-[1.5]" style={{ color: "var(--soft)" }}>
              {isForgot
                ? "Entre ton adresse e-mail pour recevoir un lien de réinitialisation."
                : isSignup
                ? "Rejoins la communauté, 100% gratuit."
                : "Bienvenue de retour sur Kayakbet."}
            </p>

            {/* Google */}
            {!isForgot && (
              <button type="button" className="lp-btn-google" onClick={handleGoogle}>
                <span className="lp-g-icon">
                  <svg viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 1 0 24 44c11 0 20-8 20-20 0-1.3-.1-2.3-.4-3.5Z"/>
                    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A20 20 0 0 0 6.3 14.7Z"/>
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44Z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.3 36 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5Z"/>
                  </svg>
                </span>
                Continuer avec Google
              </button>
            )}

            {/* Divider */}
            {!isForgot && <div className="lp-divider"><span>ou</span></div>}
            {isForgot  && <div style={{ marginTop: "24px" }} />}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="lp-field">
                <label htmlFor="lp-email">Adresse e-mail</label>
                <div>
                  <input id="lp-email" type="email" placeholder="prenom.nom@email.com" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>

              {!isForgot && (
                <div className="lp-field">
                  <label htmlFor="lp-pw">Mot de passe</label>
                  <div className="lp-field-pw">
                    <input id="lp-pw" type={showPw ? "text" : "password"} placeholder="••••••••" autoComplete={isSignup ? "new-password" : "current-password"} required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="button" className="lp-pw-toggle" aria-label={showPw ? "Masquer" : "Afficher le mot de passe"} onClick={() => setShowPw(v => !v)}>
                      {showPw ? <EyeOff /> : <EyeOpen />}
                    </button>
                  </div>
                </div>
              )}

              {mode === "login" && (
                <div className="flex items-center justify-between mt-[2px] mb-[26px]">
                  <label className="lp-remember">
                    <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                    Se souvenir de moi
                  </label>
                  <button
                    type="button"
                    className="font-archivo font-bold text-[13px] transition-colors"
                    style={{ color: "var(--cyan)", background: "none", border: "none", cursor: "pointer" }}
                    onClick={() => switchMode("forgot")}
                    onMouseOver={e => (e.currentTarget.style.color = "#fff")}
                    onMouseOut={e => (e.currentTarget.style.color = "var(--cyan)")}
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

              {TURNSTILE_SITE_KEY && (
                <div style={{ margin: "4px 0 18px" }}>
                  <Turnstile onToken={setCaptchaToken} onExpire={() => setCaptchaToken("")} resetKey={captchaReset} />
                </div>
              )}

              {error && (
                <p className="font-archivo text-[13px] rounded-[10px] px-4 py-3 mb-4" style={{ color: "#FF7A45", background: "rgba(255,122,69,.1)", border: "1px solid rgba(255,122,69,.25)" }}>
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="lp-btn-primary" style={{ marginTop: mode === "login" ? 0 : "26px" }}>
                {loading ? "Chargement…" : isForgot ? "Envoyer le lien" : isSignup ? "Créer mon compte" : "Se connecter"}
              </button>
            </form>
          </div>
        </div>

        {/* Footer toggle */}
        <p className="text-center mt-7 text-[14px] font-archivo" style={{ color: "var(--soft)" }}>
          {isForgot ? (
            <>Retour à{" "}<button className="font-bold" style={{ color: "var(--cyan)", background: "none", border: "none", cursor: "pointer" }} onClick={() => switchMode("login")}>la connexion</button></>
          ) : isSignup ? (
            <>Déjà membre ?{" "}<button className="font-bold" style={{ color: "var(--cyan)", background: "none", border: "none", cursor: "pointer" }} onClick={() => switchMode("login")}>Connexion</button></>
          ) : (
            <>Pas encore de compte ?{" "}<button className="font-bold" style={{ color: "var(--cyan)", background: "none", border: "none", cursor: "pointer" }} onClick={() => switchMode("signup")}>Créer un compte</button></>
          )}
        </p>
      </div>
    </div>
  );
}
