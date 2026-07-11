"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function OddsInfoModal({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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

  return (
    <div className="kb-modal-scrim" onClick={onClose}>
      <div
        className="kb-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Comprendre les cotes"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kb-modal-head">
          <h3>Comprendre les cotes</h3>
          <button className="kb-modal-close" aria-label="Fermer" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="kb-modal-body odds-info-body">
          <p>
            La cote indique combien rapporte ta mise si ton pronostic est juste : elle
            se multiplie par le montant misé.
          </p>
          <div className="odds-info-example">
            <span>100 cr misés</span>
            <span className="x">×</span>
            <span className="cote">1.65</span>
            <span className="eq">=</span>
            <span className="gain">165 cr</span>
          </div>
          <p>Plus la cote est élevée, plus le pronostic est jugé difficile — et plus le gain potentiel est important.</p>

          <div className="odds-info-types">
            <div className="odds-info-type"><b>Vainqueur</b><span>L&apos;athlète termine 1er.</span></div>
            <div className="odds-info-type"><b>Top 3 / 5 / 10 / 20</b><span>L&apos;athlète termine dans les N premiers.</span></div>
            <div className="odds-info-type"><b>Place exacte</b><span>L&apos;athlète termine exactement à la place jouée.</span></div>
            <div className="odds-info-type"><b>Temps exact</b><span>Le temps final correspond au dixième de seconde près.</span></div>
          </div>

          <p className="odds-info-note">
            Un seul pari de classement (Vainqueur/Top 3/5/10/20) par athlète — et Place exacte
            ne se combine pas avec Vainqueur pour le même athlète. Maximum 200 cr misés au total
            sur un même athlète, tous paris en attente confondus.
          </p>
        </div>
      </div>
    </div>
  );
}
