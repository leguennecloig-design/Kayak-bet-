"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onYes: () => void; // "Oui, je suis abonné(e)" -> ouvre le claim (ReferralModal)
  onNo: () => void;   // "Pas encore" -> ferme, reprogrammé aléatoirement plus tard
};

// Pop-up affichée au lancement de la PWA : demande si le joueur suit
// @kayakbet sur Instagram. "Oui" ouvre le claim du bonus (ne se réaffiche
// plus jamais) ; "Pas encore" ferme et se reprogramme aléatoirement.
export default function InstagramNudgeModal({ open, onClose, onYes, onNo }: Props) {
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
        aria-label="Instagram"
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
          <div className="nudge-icon nudge-icon-insta">
            <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" /></svg>
          </div>
          <h4 className="nudge-title">Suis-tu @kayakbet sur Instagram ?</h4>
          <p className="nudge-text">
            Abonne-toi à <b>@kayakbet</b> et récupère <b>500 crédits</b> de bonus —
            ça prend 10 secondes.
          </p>
          <button className="nudge-cta" onClick={onYes}>Oui, je suis abonné(e)</button>
          <button className="nudge-later" onClick={onNo}>Pas encore</button>
        </div>
      </div>
    </div>
  );
}
