"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  icon: ReactNode;
  title: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
  ctaBusy?: boolean;
};

// Pop-up de relance générique (notifications désactivées, pas de photo de
// profil…) : icône + titre + texte + un seul bouton d'action.
export default function SimpleNudgeModal({ open, onClose, icon, title, body, ctaLabel, onCta, ctaBusy }: Props) {
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

  return (
    <div className="kb-modal-scrim" onClick={onClose}>
      <div
        className="kb-modal nudge-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kb-modal-head">
          <h3>&nbsp;</h3>
          <button className="kb-modal-close" aria-label="Fermer" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="kb-modal-body nudge-body">
          <div className="nudge-icon">{icon}</div>
          <h4 className="nudge-title">{title}</h4>
          <p className="nudge-text">{body}</p>
          <button className="nudge-cta" onClick={onCta} disabled={ctaBusy}>
            {ctaBusy ? "…" : ctaLabel}
          </button>
          <button className="nudge-later" onClick={onClose}>Plus tard</button>
        </div>
      </div>
    </div>
  );
}
