"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  competitionId: string;
  myReferralCode: string | null;
};

// Parrainage lié à UNE compétition (distinct du parrainage général) : le
// code se copie comme un lien direct vers /c/[id], ou se donne à l'oral —
// l'ami peut aussi le saisir manuellement ici s'il est déjà inscrit. Le
// bonus de 200 cr (les deux) tombe à son premier pari sur cette compétition,
// jamais à cet écran.
export default function CompetitionReferralModal({ open, onClose, competitionId, myReferralCode }: Props) {
  const [copied, setCopied] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemStatus, setRedeemStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [redeemError, setRedeemError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  const link = myReferralCode && typeof window !== "undefined"
    ? `${window.location.origin}/c/${competitionId}?ref=${myReferralCode}`
    : "";

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function redeem() {
    const trimmed = redeemCode.trim();
    if (!trimmed || redeemStatus === "loading") return;
    setRedeemStatus("loading");
    setRedeemError("");
    try {
      const res = await fetch(`/api/competitions/${competitionId}/referral`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setRedeemStatus("done");
      } else {
        setRedeemStatus("error");
        setRedeemError(json.error ?? "Code invalide");
      }
    } catch {
      setRedeemStatus("error");
      setRedeemError("Erreur réseau");
    }
  }

  return (
    <div className="kb-modal-scrim" onClick={onClose}>
      <div
        className="kb-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Parrainage compétition"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kb-modal-head">
          <h3>Invite un ami sur cette compétition</h3>
          <button className="kb-modal-close" aria-label="Fermer" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="kb-modal-body">
          <p className="referral-explain">
            Partage ton lien : dès que ton ami place <b>son premier pari sur cette compétition</b>,
            vous recevez <b>200 crédits chacun</b>.
          </p>

          {myReferralCode ? (
            <button className="referral-card" onClick={copyLink}>
              <span className="kb-coin kb-coin-lg" aria-hidden="true"><span className="kb-face"><span className="kb-letters">KB</span></span></span>
              <span className="tx">
                <span className="l">Ton lien pour cette compétition</span>
                <span className="v">{myReferralCode}</span>
              </span>
              <span className="cp">{copied ? "Copié ✓" : "Copier"}</span>
            </button>
          ) : (
            <p className="catmodal-status">Chargement de ton code…</p>
          )}

          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
            <p className="referral-explain" style={{ marginBottom: 10 }}>
              Un ami t&apos;a donné son code pour cette compétition ?
            </p>
            {redeemStatus === "done" ? (
              <p className="catmodal-status">
                Code enregistré ✓ Place ton premier pari ici pour débloquer les 200 cr.
              </p>
            ) : (
              <div className="catmodal-inline-input">
                <input
                  type="text"
                  placeholder="Code de ton ami"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  maxLength={12}
                />
                <button
                  type="button"
                  className="catmodal-inline-confirm"
                  disabled={!redeemCode.trim() || redeemStatus === "loading"}
                  onClick={redeem}
                >
                  Valider
                </button>
                {redeemStatus === "error" && <span className="catmodal-inline-err">{redeemError}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
