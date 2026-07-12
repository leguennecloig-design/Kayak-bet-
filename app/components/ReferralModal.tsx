"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  instagramRewardClaimed?: boolean;
  instagramRewardBusy?: boolean;
  onClaimInstagramReward?: () => void;
};

const InstaIcon = () => <svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" /><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" /></svg>;

export default function ReferralModal({ open, onClose, instagramRewardClaimed, instagramRewardBusy, onClaimInstagramReward }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [referredUsers, setReferredUsers] = useState<{ name: string; date: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/referral")
      .then(res => res.json())
      .then((data) => {
        setCode(data.code ?? null);
        setReferredUsers(data.referredUsers ?? []);
      })
      .catch(() => setCode(null))
      .finally(() => setLoading(false));
  }, [open]);

  // Ne dépend que de `open` (voir EditProfileModal pour le pourquoi).
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

  const link = code && typeof window !== "undefined" ? `${window.location.origin}/login?ref=${code}` : "";

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="kb-modal-scrim" onClick={onClose}>
      <div
        className="kb-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Parrainage"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kb-modal-head">
          <h3>Parrainage</h3>
          <button className="kb-modal-close" aria-label="Fermer" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="kb-modal-body">
          <p className="referral-explain">
            Invite tes amis sur Kayakbet : ils reçoivent <b>400 crédits</b> dès leur inscription via ton lien,
            et toi tu reçois aussi <b>400 crédits</b> — à chaque nouveau filleul.
          </p>

          {loading ? (
            <p className="catmodal-status">Chargement…</p>
          ) : code ? (
            <>
              <button className="referral-card" onClick={copyLink}>
                <span className="kb-coin kb-coin-lg" aria-hidden="true"><span className="kb-face"><span className="kb-letters">KB</span></span></span>
                <span className="tx">
                  <span className="l">Mon code</span>
                  <span className="v">{code}</span>
                </span>
                <span className="cp">{copied ? "Copié ✓" : "Copier"}</span>
              </button>

              <p className="referral-count">
                {referredUsers.length === 0
                  ? "Pas encore de filleul — partage ton lien pour gagner des crédits !"
                  : `${referredUsers.length} filleul${referredUsers.length > 1 ? "s" : ""} déjà parrainé${referredUsers.length > 1 ? "s" : ""}`}
              </p>
            </>
          ) : (
            <p className="catmodal-status err">Impossible de charger ton code de parrainage.</p>
          )}

          {onClaimInstagramReward && (
            <div className="profil-section" style={{ margin: 0 }}>
              <div className="profil-section-head">
                <span className="ps-head-ic"><InstaIcon /> Bonus Instagram</span>
              </div>
              {instagramRewardClaimed ? (
                <p style={{ color: "var(--soft)", fontFamily: "var(--font-archivo)", fontSize: "12.5px", margin: 0 }}>
                  Récompense obtenue · merci de nous suivre ✓
                </p>
              ) : (
                <>
                  <p style={{ color: "var(--soft)", fontFamily: "var(--font-archivo)", fontSize: "12.5px", margin: "0 0 13px" }}>
                    Abonne-toi à notre compte Instagram et récupère 500 crédits offerts.
                  </p>
                  <div className="profil-actions" style={{ marginTop: 0 }}>
                    <a
                      className="profil-edit-btn"
                      href="https://www.instagram.com/kayakbet/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Suivre @kayakbet
                    </a>
                    <button className="profil-edit-btn" disabled={instagramRewardBusy} onClick={onClaimInstagramReward}>
                      {instagramRewardBusy ? "…" : "Récupérer mes 500 crédits"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
