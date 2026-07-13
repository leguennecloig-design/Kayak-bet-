"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: (dontShowAgain: boolean) => void;
  onShare: (dontShowAgain: boolean) => void; // ouvre le parrainage (ReferralModal)
};

// Pop-up affichée au lancement de la PWA : incite à partager son lien de
// parrainage. Case "Ne plus afficher" — si cochée, ne réapparaît plus jamais ;
// sinon réapparaît aux prochains lancements (comportement par défaut).
export default function ReferralNudgeModal({ open, onClose, onShare }: Props) {
  const [dontShow, setDontShow] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current(dontShow);
    }
    window.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="kb-modal-scrim" onClick={() => onClose(dontShow)}>
      <div
        className="kb-modal nudge-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Parrainage"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kb-modal-head">
          <h3>&nbsp;</h3>
          <button className="kb-modal-close" aria-label="Fermer" onClick={() => onClose(dontShow)}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="kb-modal-body nudge-body">
          <div className="nudge-icon">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 15V4m0 0 3.5 3.5M12 4 8.5 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 11v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </div>
          <h4 className="nudge-title">Invite tes amis, gagnez tous les deux !</h4>
          <p className="nudge-text">
            Partage ton lien d&apos;invitation : tes amis reçoivent <b>400 crédits</b> à
            l&apos;inscription, et toi aussi <b>400 crédits</b> à chaque filleul.
          </p>
          <button className="nudge-cta" onClick={() => onShare(dontShow)}>Partager mon lien</button>
          <button className="nudge-later" onClick={() => onClose(dontShow)}>Plus tard</button>
          <label className="nudge-checkbox">
            <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
            <span>Ne plus afficher</span>
          </label>
        </div>
      </div>
    </div>
  );
}
