"use client";

import { useEffect, useRef, useState } from "react";
import InstagramRewardCard, { type IgRewardStatus } from "./InstagramRewardCard";

type Props = {
  open: boolean;
  onClose: () => void;
  instagramRewardStatus?: IgRewardStatus;
  instagramRewardBusy?: boolean;
  onRequestInstagramReward?: (handle: string) => void;
};

export default function ReferralModal({ open, onClose, instagramRewardStatus, instagramRewardBusy, onRequestInstagramReward }: Props) {
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

  function shareLink() {
    if (!link) return;
    const shareData = {
      title: "Kayakbet",
      text: "Rejoins-moi sur Kayakbet, le pronostic 100% gratuit sur le kayak de descente ! 400 crédits offerts dès ton inscription 🛶",
      url: link,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      copyLink();
    }
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

              <div className="referral-link">
                <span className="referral-link-label">Mon lien d&apos;invitation</span>
                <span className="referral-link-url">{link}</span>
              </div>
              <button className="referral-share" onClick={shareLink}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 15V4m0 0 3.5 3.5M12 4 8.5 7.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 11v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>
                Partager mon lien
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

          {onRequestInstagramReward && instagramRewardStatus && (
            <InstagramRewardCard
              status={instagramRewardStatus}
              busy={!!instagramRewardBusy}
              onRequest={onRequestInstagramReward}
              style={{ margin: 0 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
